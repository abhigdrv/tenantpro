// src/controllers/reportsController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Dashboard with summary
exports.dashboard = async (req, res) => {
    try {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const firstDayOfYear = new Date(now.getFullYear(), 0, 1);

        // Get summary statistics
        const totalProperties = await prisma.property.count();
        const totalRooms = await prisma.room.count();
        const occupiedRooms = await prisma.room.count({ where: { status: 'occupied' } });
        const vacantRooms = await prisma.room.count({ where: { status: 'vacant' } });
        const totalTenants = await prisma.tenant.count();
        const activeLeases = await prisma.lease.count({
            where: {
                startDate: { lte: now },
                endDate: { gte: now }
            }
        });

        // Revenue this month
        const monthlyPayments = await prisma.payment.aggregate({
            where: {
                paymentDate: { gte: firstDayOfMonth },
                status: 'paid'
            },
            _sum: { amount: true }
        });

        // Revenue this year
        const yearlyPayments = await prisma.payment.aggregate({
            where: {
                paymentDate: { gte: firstDayOfYear },
                status: 'paid'
            },
            _sum: { amount: true }
        });

        // Outstanding payments
        const outstandingPayments = await prisma.payment.aggregate({
            where: { status: 'pending' },
            _sum: { amount: true }
        });

        // Leases expiring in next 30 days
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const expiringLeases = await prisma.lease.count({
            where: {
                endDate: {
                    gte: now,
                    lte: thirtyDaysFromNow
                }
            }
        });

        // Maintenance requests
        const openMaintenance = await prisma.maintenanceRequest.count({
            where: { status: 'open' }
        });

        // Monthly revenue trend (last 6 months)
        const monthlyRevenue = [];
        for (let i = 5; i >= 0; i--) {
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
            
            const revenue = await prisma.payment.aggregate({
                where: {
                    paymentDate: { gte: monthStart, lte: monthEnd },
                    status: 'paid'
                },
                _sum: { amount: true }
            });

            monthlyRevenue.push({
                month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                amount: revenue._sum.amount || 0
            });
        }

        // Occupancy rate by property
        const properties = await prisma.property.findMany({
            include: {
                rooms: true
            }
        });

        const propertyOccupancy = properties.map(prop => {
            const total = prop.rooms.length;
            const occupied = prop.rooms.filter(r => r.status === 'occupied').length;
            return {
                name: prop.name,
                occupancyRate: total > 0 ? ((occupied / total) * 100).toFixed(1) : 0,
                occupied,
                total
            };
        });

        res.render('reports/dashboard', {
            summary: {
                totalProperties,
                totalRooms,
                occupiedRooms,
                vacantRooms,
                totalTenants,
                activeLeases,
                monthlyRevenue: monthlyPayments._sum.amount || 0,
                yearlyRevenue: yearlyPayments._sum.amount || 0,
                outstandingAmount: outstandingPayments._sum.amount || 0,
                expiringLeases,
                openMaintenance,
                occupancyRate: totalRooms > 0 ? ((occupiedRooms / totalRooms) * 100).toFixed(1) : 0
            },
            monthlyRevenue,
            propertyOccupancy
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error generating dashboard.');
    }
};

// Revenue Report
exports.revenueReport = async (req, res) => {
    try {
        const { startDate, endDate, groupBy } = req.query;
        const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
        const end = endDate ? new Date(endDate) : new Date();

        const payments = await prisma.payment.findMany({
            where: {
                paymentDate: { gte: start, lte: end },
                status: 'paid'
            },
            include: {
                lease: {
                    include: {
                        tenant: true,
                        room: { include: { property: true } }
                    }
                }
            },
            orderBy: { paymentDate: 'desc' }
        });

        const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

        // Group by property
        const revenueByProperty = {};
        payments.forEach(payment => {
            const propertyName = payment.lease.room.property.name;
            if (!revenueByProperty[propertyName]) {
                revenueByProperty[propertyName] = 0;
            }
            revenueByProperty[propertyName] += payment.amount;
        });

        res.render('reports/revenue', {
            payments,
            totalRevenue,
            revenueByProperty,
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0]
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error generating revenue report.');
    }
};

// Payments Report
exports.paymentsReport = async (req, res) => {
    try {
        const { status, startDate, endDate } = req.query;
        
        const whereClause = {};
        if (status) whereClause.status = status;
        if (startDate && endDate) {
            whereClause.paymentDate = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            };
        }

        const payments = await prisma.payment.findMany({
            where: whereClause,
            include: {
                lease: {
                    include: {
                        tenant: true,
                        room: { include: { property: true } }
                    }
                }
            },
            orderBy: { paymentDate: 'desc' }
        });

        const summary = {
            total: payments.length,
            totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
            paid: payments.filter(p => p.status === 'paid').length,
            pending: payments.filter(p => p.status === 'pending').length,
            paidAmount: payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0),
            pendingAmount: payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0)
        };

        res.render('reports/payments', { payments, summary, filters: req.query });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error generating payments report.');
    }
};

// Outstanding Payments Report
exports.outstandingReport = async (req, res) => {
    try {
        const outstandingPayments = await prisma.payment.findMany({
            where: { status: 'pending' },
            include: {
                lease: {
                    include: {
                        tenant: true,
                        room: { include: { property: true } }
                    }
                }
            },
            orderBy: { paymentDate: 'asc' }
        });

        const totalOutstanding = outstandingPayments.reduce((sum, p) => sum + p.amount, 0);

        // Group by tenant
        const outstandingByTenant = {};
        outstandingPayments.forEach(payment => {
            const tenantName = `${payment.lease.tenant.firstName} ${payment.lease.tenant.lastName}`;
            if (!outstandingByTenant[tenantName]) {
                outstandingByTenant[tenantName] = {
                    tenant: payment.lease.tenant,
                    amount: 0,
                    count: 0
                };
            }
            outstandingByTenant[tenantName].amount += payment.amount;
            outstandingByTenant[tenantName].count++;
        });

        res.render('reports/outstanding', {
            outstandingPayments,
            totalOutstanding,
            outstandingByTenant: Object.values(outstandingByTenant)
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error generating outstanding report.');
    }
};

// Occupancy Report
exports.occupancyReport = async (req, res) => {
    try {
        const properties = await prisma.property.findMany({
            include: {
                rooms: {
                    include: {
                        leases: {
                            where: {
                                startDate: { lte: new Date() },
                                endDate: { gte: new Date() }
                            },
                            include: { tenant: true }
                        }
                    }
                }
            }
        });

        const occupancyData = properties.map(property => {
            const totalRooms = property.rooms.length;
            const occupiedRooms = property.rooms.filter(r => r.status === 'occupied').length;
            const occupancyRate = totalRooms > 0 ? ((occupiedRooms / totalRooms) * 100).toFixed(1) : 0;

            return {
                property,
                totalRooms,
                occupiedRooms,
                vacantRooms: totalRooms - occupiedRooms,
                occupancyRate
            };
        });

        const overallStats = {
            totalRooms: occupancyData.reduce((sum, p) => sum + p.totalRooms, 0),
            occupiedRooms: occupancyData.reduce((sum, p) => sum + p.occupiedRooms, 0),
            vacantRooms: occupancyData.reduce((sum, p) => sum + p.vacantRooms, 0)
        };
        overallStats.occupancyRate = overallStats.totalRooms > 0 
            ? ((overallStats.occupiedRooms / overallStats.totalRooms) * 100).toFixed(1) 
            : 0;

        res.render('reports/occupancy', { occupancyData, overallStats });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error generating occupancy report.');
    }
};

// Vacancy Report
exports.vacancyReport = async (req, res) => {
    try {
        const vacantRooms = await prisma.room.findMany({
            where: { status: 'vacant' },
            include: { property: true }
        });

        const vacancyByProperty = {};
        vacantRooms.forEach(room => {
            const propertyName = room.property.name;
            if (!vacancyByProperty[propertyName]) {
                vacancyByProperty[propertyName] = [];
            }
            vacancyByProperty[propertyName].push(room);
        });

        res.render('reports/vacancy', { vacantRooms, vacancyByProperty });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error generating vacancy report.');
    }
};

// Tenants Report
exports.tenantsReport = async (req, res) => {
    try {
        const tenants = await prisma.tenant.findMany({
            include: {
                leases: {
                    where: {
                        startDate: { lte: new Date() },
                        endDate: { gte: new Date() }
                    },
                    include: {
                        room: { include: { property: true } },
                        payments: true
                    }
                }
            }
        });

        const tenantData = tenants.map(tenant => {
            const activeLease = tenant.leases[0];
            const totalPaid = activeLease 
                ? activeLease.payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0)
                : 0;
            const totalPending = activeLease
                ? activeLease.payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0)
                : 0;

            return {
                tenant,
                activeLease,
                totalPaid,
                totalPending,
                hasActiveLease: !!activeLease
            };
        });

        res.render('reports/tenants', { tenantData });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error generating tenants report.');
    }
};

// Lease Expiry Report
exports.leaseExpiryReport = async (req, res) => {
    try {
        const { days } = req.query;
        const daysAhead = days ? parseInt(days) : 30;
        
        const now = new Date();
        const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

        const expiringLeases = await prisma.lease.findMany({
            where: {
                endDate: {
                    gte: now,
                    lte: futureDate
                }
            },
            include: {
                tenant: true,
                room: { include: { property: true } }
            },
            orderBy: { endDate: 'asc' }
        });

        res.render('reports/lease-expiry', { expiringLeases, daysAhead });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error generating lease expiry report.');
    }
};

// Properties Report
exports.propertiesReport = async (req, res) => {
    try {
        const properties = await prisma.property.findMany({
            include: {
                rooms: {
                    include: {
                        leases: {
                            where: {
                                startDate: { lte: new Date() },
                                endDate: { gte: new Date() }
                            }
                        }
                    }
                },
                maintenance: true
            }
        });

        const propertyData = await Promise.all(properties.map(async property => {
            const totalRooms = property.rooms.length;
            const occupiedRooms = property.rooms.filter(r => r.status === 'occupied').length;
            
            // Calculate revenue
            const leaseIds = property.rooms.flatMap(r => r.leases.map(l => l.id));
            const revenue = await prisma.payment.aggregate({
                where: {
                    leaseId: { in: leaseIds },
                    status: 'paid',
                    paymentDate: {
                        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                    }
                },
                _sum: { amount: true }
            });

            return {
                property,
                totalRooms,
                occupiedRooms,
                vacantRooms: totalRooms - occupiedRooms,
                occupancyRate: totalRooms > 0 ? ((occupiedRooms / totalRooms) * 100).toFixed(1) : 0,
                monthlyRevenue: revenue._sum.amount || 0,
                openMaintenance: property.maintenance.filter(m => m.status === 'open').length
            };
        }));

        res.render('reports/properties', { propertyData });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error generating properties report.');
    }
};

// Maintenance Report
exports.maintenanceReport = async (req, res) => {
    try {
        const { status, priority } = req.query;
        
        const whereClause = {};
        if (status) whereClause.status = status;
        if (priority) whereClause.priority = priority;

        const maintenanceRequests = await prisma.maintenanceRequest.findMany({
            where: whereClause,
            include: {
                tenant: true,
                property: true
            },
            orderBy: { createdAt: 'desc' }
        });

        const summary = {
            total: maintenanceRequests.length,
            open: maintenanceRequests.filter(m => m.status === 'open').length,
            inProgress: maintenanceRequests.filter(m => m.status === 'in_progress').length,
            completed: maintenanceRequests.filter(m => m.status === 'completed').length,
            high: maintenanceRequests.filter(m => m.priority === 'high').length,
            medium: maintenanceRequests.filter(m => m.priority === 'medium').length,
            low: maintenanceRequests.filter(m => m.priority === 'low').length
        };

        res.render('reports/maintenance', { maintenanceRequests, summary, filters: req.query });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error generating maintenance report.');
    }
};

// Export Functions
exports.exportRevenue = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
        const end = endDate ? new Date(endDate) : new Date();

        const payments = await prisma.payment.findMany({
            where: {
                paymentDate: { gte: start, lte: end },
                status: 'paid'
            },
            include: {
                lease: {
                    include: {
                        tenant: true,
                        room: { include: { property: true } }
                    }
                }
            },
            orderBy: { paymentDate: 'desc' }
        });

        let csv = 'Date,Tenant,Property,Room,Amount,Payment For\n';
        payments.forEach(p => {
            csv += `${p.paymentDate.toLocaleDateString()},`;
            csv += `"${p.lease.tenant.firstName} ${p.lease.tenant.lastName}",`;
            csv += `"${p.lease.room.property.name}",`;
            csv += `${p.lease.room.roomNumber},`;
            csv += `${p.amount},`;
            csv += `${p.paymentForMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=revenue-report.csv');
        res.send(csv);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error exporting revenue report.');
    }
};

exports.exportPayments = async (req, res) => {
    try {
        const payments = await prisma.payment.findMany({
            include: {
                lease: {
                    include: {
                        tenant: true,
                        room: { include: { property: true } }
                    }
                }
            },
            orderBy: { paymentDate: 'desc' }
        });

        let csv = 'Date,Tenant,Property,Room,Amount,Status,Payment For,Note\n';
        payments.forEach(p => {
            csv += `${p.paymentDate.toLocaleDateString()},`;
            csv += `"${p.lease.tenant.firstName} ${p.lease.tenant.lastName}",`;
            csv += `"${p.lease.room.property.name}",`;
            csv += `${p.lease.room.roomNumber},`;
            csv += `${p.amount},`;
            csv += `${p.status},`;
            csv += `${p.paymentForMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })},`;
            csv += `"${p.note || ''}"\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=payments-report.csv');
        res.send(csv);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error exporting payments report.');
    }
};

exports.exportTenants = async (req, res) => {
    try {
        const tenants = await prisma.tenant.findMany({
            include: {
                leases: {
                    where: {
                        startDate: { lte: new Date() },
                        endDate: { gte: new Date() }
                    },
                    include: {
                        room: { include: { property: true } }
                    }
                }
            }
        });

        let csv = 'Name,Email,Phone,Property,Room,Lease Start,Lease End,Rent Amount\n';
        tenants.forEach(t => {
            const activeLease = t.leases[0];
            csv += `"${t.firstName} ${t.lastName}",`;
            csv += `${t.email},`;
            csv += `${t.phone || ''},`;
            if (activeLease) {
                csv += `"${activeLease.room.property.name}",`;
                csv += `${activeLease.room.roomNumber},`;
                csv += `${activeLease.startDate.toLocaleDateString()},`;
                csv += `${activeLease.endDate.toLocaleDateString()},`;
                csv += `${activeLease.rentAmount}`;
            } else {
                csv += ',,,,,';
            }
            csv += '\n';
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=tenants-report.csv');
        res.send(csv);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error exporting tenants report.');
    }
};
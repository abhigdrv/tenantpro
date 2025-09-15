// src/controllers/dashboardController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.showDashboard = async (req, res) => {
    try {
        const totalProperties = await prisma.property.count();
        const totalTenants = await prisma.tenant.count();
        const occupiedRooms = await prisma.room.count({ where: { status: 'occupied' } });
        const vacantRooms = await prisma.room.count({ where: { status: 'vacant' } });
        const totalRent = await prisma.payment.aggregate({
            _sum: { amount: true }
        });
        const overduePayments = await prisma.payment.count({
            where: { status: 'overdue' }
        });

        // Data for Charts
        const monthlyPayments = await prisma.payment.groupBy({
            by: ['paymentDate'],
            _sum: { amount: true },
            orderBy: { paymentDate: 'asc' },
        });

        const maintenanceRequests = await prisma.maintenanceRequest.groupBy({
            by: ['status'],
            _count: { status: true },
        });

        res.render('dashboard/index', {
            metrics: {
                totalProperties,
                totalTenants,
                occupiedRooms,
                vacantRooms,
                totalRent: totalRent._sum.amount || 0,
                overduePayments
            },
            monthlyPayments: monthlyPayments.map(p => ({
                date: p.paymentDate.toISOString().split('T')[0],
                amount: p._sum.amount
            })),
            maintenanceRequests
        });
    } catch (error) {
        console.error("Error fetching dashboard data:", error);
        res.status(500).send("Error fetching dashboard data.");
    }
};
// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // Create a default admin user
  const hashedPassword = await bcrypt.hash('adminpassword', 10);
  const user = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
    },
  });
  console.log(`Created user with id: ${user.id}`);

  // Create a sample property
  const property = await prisma.property.create({
    data: {
      name: 'Central Park Residences',
      address: '123 Main St',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      description: 'A modern apartment building in the heart of the city.',
    },
  });
  console.log(`Created property with id: ${property.id}`);

  // Create sample rooms for the property
  const rooms = await Promise.all([
    prisma.room.create({
      data: {
        propertyId: property.id,
        roomNumber: '101A',
        status: 'occupied',
        rentAmount: 1500.00,
      },
    }),
    prisma.room.create({
      data: {
        propertyId: property.id,
        roomNumber: '102B',
        status: 'vacant',
        rentAmount: 1200.00,
      },
    }),
    prisma.room.create({
      data: {
        propertyId: property.id,
        roomNumber: '103C',
        status: 'maintenance',
        rentAmount: 1800.00,
      },
    }),
  ]);
  console.log(`Created ${rooms.length} rooms.`);

  // Create a sample tenant
  const tenant = await prisma.tenant.create({
    data: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '555-123-4567',
      dob: new Date('1990-05-15'),
    },
  });
  console.log(`Created tenant with id: ${tenant.id}`);

  // Create a lease for the tenant and a room
  const lease = await prisma.lease.create({
    data: {
      tenantId: tenant.id,
      roomId: rooms[0].id,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2025-01-01'),
      rentAmount: 1500.00,
      depositPaid: 1500.00,
    },
  });
  console.log(`Created lease with id: ${lease.id}`);

  // Create a sample payment
  const payment = await prisma.payment.create({
    data: {
      leaseId: lease.id,
      amount: 1500.00,
      paymentDate: new Date(),
      status: 'paid',
    },
  });
  console.log(`Created payment with id: ${payment.id}`);

  // Create a sample maintenance request
  const maintenanceRequest = await prisma.maintenanceRequest.create({
    data: {
      tenantId: tenant.id,
      propertyId: property.id,
      title: 'Leaky Faucet in Kitchen',
      description: 'The kitchen faucet has been dripping non-stop for the past three days.',
      priority: 'medium',
      status: 'open',
    },
  });
  console.log(`Created maintenance request with id: ${maintenanceRequest.id}`);

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
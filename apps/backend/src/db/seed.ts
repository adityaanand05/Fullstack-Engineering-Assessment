import { PrismaClient } from '@prisma/client';
import { AgentType, OrderStatus, PaymentStatus, RefundStatus } from '../types';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create sample user
  const user = await prisma.user.upsert({
    where: { email: 'john@example.com' },
    update: {},
    create: {
      email: 'john@example.com',
      name: 'John Doe',
    },
  });

  // Create sample orders
  const order1 = await prisma.order.upsert({
    where: { orderNumber: 'ORD-001' },
    update: {},
    create: {
      orderNumber: 'ORD-001',
      userId: user.id,
      status: OrderStatus.SHIPPED,
      total: 299.99,
      currency: 'USD',
      trackingNumber: 'TRK123456789',
      trackingUrl: 'https://track.example.com/TRK123456789',
      items: [
        { name: 'Wireless Headphones', quantity: 1, price: 199.99 },
        { name: 'Phone Case', quantity: 2, price: 49.99 },
      ],
      shippingAddress: {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zip: '10001',
        country: 'USA',
      },
    },
  });

  const order2 = await prisma.order.upsert({
    where: { orderNumber: 'ORD-002' },
    update: {},
    create: {
      orderNumber: 'ORD-002',
      userId: user.id,
      status: OrderStatus.PENDING,
      total: 149.50,
      currency: 'USD',
      items: [{ name: 'Smart Watch', quantity: 1, price: 149.50 }],
      shippingAddress: {
        street: '456 Oak Ave',
        city: 'Los Angeles',
        state: 'CA',
        zip: '90001',
        country: 'USA',
      },
    },
  });

  const order3 = await prisma.order.upsert({
    where: { orderNumber: 'ORD-003' },
    update: {},
    create: {
      orderNumber: 'ORD-003',
      userId: user.id,
      status: OrderStatus.DELIVERED,
      total: 599.00,
      currency: 'USD',
      items: [
        { name: 'Laptop Stand', quantity: 1, price: 79.00 },
        { name: 'USB-C Hub', quantity: 2, price: 89.99 },
      ],
      shippingAddress: {
        street: '789 Pine Rd',
        city: 'Chicago',
        state: 'IL',
        zip: '60601',
        country: 'USA',
      },
    },
  });

  // Create payments
  const payment1 = await prisma.payment.upsert({
    where: { transactionId: 'TXN-001' },
    update: {},
    create: {
      orderId: order1.id,
      amount: 299.99,
      currency: 'USD',
      status: PaymentStatus.COMPLETED,
      paymentMethod: 'credit_card',
      transactionId: 'TXN-001',
    },
  });

  const payment2 = await prisma.payment.upsert({
    where: { transactionId: 'TXN-002' },
    update: {},
    create: {
      orderId: order2.id,
      amount: 149.50,
      currency: 'USD',
      status: PaymentStatus.PENDING,
      paymentMethod: 'credit_card',
      transactionId: 'TXN-002',
    },
  });

  const payment3 = await prisma.payment.upsert({
    where: { transactionId: 'TXN-003' },
    update: {},
    create: {
      orderId: order3.id,
      amount: 599.00,
      currency: 'USD',
      status: PaymentStatus.COMPLETED,
      paymentMethod: 'paypal',
      transactionId: 'TXN-003',
    },
  });

  // Create invoices
  await prisma.invoice.createMany({
    data: [
      { paymentId: payment1.id, invoiceUrl: 'https://invoice.example.com/INV-001', amount: 299.99, status: 'PAID' },
      { paymentId: payment2.id, invoiceUrl: 'https://invoice.example.com/INV-002', amount: 149.50, status: 'PENDING' },
      { paymentId: payment3.id, invoiceUrl: 'https://invoice.example.com/INV-003', amount: 599.00, status: 'PAID' },
    ],
    skipDuplicates: true,
  });

  // Create refunds
  await prisma.refund.createMany({
    data: [
      { orderId: order1.id, amount: 50.00, currency: 'USD', status: RefundStatus.PROCESSED, reason: 'Partial return' },
      { orderId: order3.id, amount: 599.00, currency: 'USD', status: RefundStatus.APPROVED, reason: 'Customer request' },
    ],
    skipDuplicates: true,
  });

  // Create sample conversations
  await prisma.conversation.create({
    data: {
      userId: user.id,
      title: 'Order Status Inquiry',
      agentType: AgentType.ORDER,
      context: {
        lastOrderNumber: 'ORD-001',
        orderStatus: 'SHIPPED',
        trackingNumber: 'TRK123456789',
      },
      messages: {
        create: [
          {
            role: 'USER',
            content: 'Hi, I want to check the status of my order ORD-001',
            agentType: AgentType.ROUTER,
          },
          {
            role: 'ASSISTANT',
            content: 'I can help you with that. Your order ORD-001 is currently shipped and on its way. The tracking number is TRK123456789. You can track it at https://track.example.com/TRK123456789',
            agentType: AgentType.ORDER,
          },
        ],
      },
    },
  });

  await prisma.conversation.create({
    data: {
      userId: user.id,
      title: 'Billing Question',
      agentType: AgentType.BILLING,
      context: {
        paymentStatus: 'COMPLETED',
        lastPaymentAmount: 299.99,
      },
      messages: {
        create: [
          {
            role: 'USER',
            content: 'I have a question about my payment',
            agentType: AgentType.ROUTER,
          },
          {
            role: 'ASSISTANT',
            content: 'I can help you with your billing inquiry. Your most recent payment of $299.99 was completed successfully on January 15, 2024.',
            agentType: AgentType.BILLING,
          },
        ],
      },
    },
  });

  console.log('✅ Database seeded successfully!');
  console.log(`📦 Created ${3} orders`);
  console.log(`💳 Created ${3} payments`);
  console.log(`📄 Created ${3} invoices`);
  console.log(`💰 Created ${2} refunds`);
  console.log(`💬 Created ${2} sample conversations`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

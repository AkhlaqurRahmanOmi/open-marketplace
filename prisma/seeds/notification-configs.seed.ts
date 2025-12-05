import { PrismaClient, NotificationChannel } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedNotificationConfigs() {
  console.log('🌱 Seeding notification configs...');

  const configs = [
    // User Events
    {
      event: 'user.registered',
      channels: [NotificationChannel.email, NotificationChannel.realtime],
      template: 'otp-email',
      priority: 'HIGH',
      enabled: true,
      retries: 3,
      description: 'Send OTP email when user registers',
      metadata: {},
    },
    {
      event: 'user.verified',
      channels: [NotificationChannel.email],
      template: 'account-verified',
      priority: 'NORMAL',
      enabled: true,
      retries: 3,
      description: 'Welcome email after account verification',
      metadata: {},
    },
    {
      event: 'password.reset.requested',
      channels: [NotificationChannel.email],
      template: 'password-reset',
      priority: 'HIGH',
      enabled: true,
      retries: 3,
      description: 'Password reset link email',
      metadata: {},
    },

    // Organization Events
    {
      event: 'organization.members.invited',
      channels: [NotificationChannel.email, NotificationChannel.realtime],
      template: 'organization-invite',
      priority: 'NORMAL',
      enabled: true,
      retries: 3,
      description: 'Organization invitation emails (bulk)',
      metadata: {
        batching: {
          enabled: true,
          size: 10,
        },
      },
    },
    {
      event: 'document.approved',
      channels: [NotificationChannel.email, NotificationChannel.realtime],
      template: 'document-approved',
      priority: 'NORMAL',
      enabled: true,
      retries: 2,
      description: 'Document approval notification',
      metadata: {},
      conditions: {
        documentType: ['ID', 'LICENSE', 'BUSINESS_LICENSE'],
      },
    },
    {
      event: 'document.rejected',
      channels: [NotificationChannel.email, NotificationChannel.realtime],
      template: 'document-rejected',
      priority: 'HIGH',
      enabled: true,
      retries: 2,
      description: 'Document rejection notification with reason',
      metadata: {},
    },

    // Order Events - Customer
    {
      event: 'order.placed.customer',
      channels: [NotificationChannel.email, NotificationChannel.push],
      template: 'order-confirmation',
      priority: 'HIGH',
      enabled: true,
      retries: 3,
      description: 'Order confirmation for customer',
      metadata: {},
    },
    {
      event: 'order.placed.vendor',
      channels: [NotificationChannel.realtime, NotificationChannel.email],
      template: 'new-order-vendor',
      priority: 'HIGH',
      enabled: true,
      retries: 2,
      description: 'New order notification for vendor',
      metadata: {},
    },
    {
      event: 'order.status.changed',
      channels: [NotificationChannel.email, NotificationChannel.push],
      template: 'order-status-update',
      priority: 'NORMAL',
      enabled: true,
      retries: 2,
      description: 'Order status change notification',
      metadata: {},
    },
    {
      event: 'order.shipped',
      channels: [NotificationChannel.email, NotificationChannel.sms],
      template: 'order-shipped',
      priority: 'HIGH',
      enabled: true,
      retries: 3,
      description: 'Order shipped with tracking info',
      metadata: {},
    },
  ];

  for (const config of configs) {
    await prisma.notificationConfig.upsert({
      where: { event: config.event },
      create: config,
      update: config,
    });
    console.log(`  ✅ ${config.event}`);
  }

  console.log('✨ Notification configs seeded successfully!');
}

// Run if called directly
if (require.main === module) {
  seedNotificationConfigs()
    .catch((error) => {
      console.error('❌ Error seeding notification configs:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

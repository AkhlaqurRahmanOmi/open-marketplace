import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsController } from './notifications.controller';
import { TestEmailController } from './test-email.controller';
import { NotificationsService } from './notifications.service';
import {
  NotificationRepository,
  NotificationTemplateRepository,
  NotificationPreferenceRepository,
} from './repositories';
import {
  EmailProvider,
  TemplateRenderingProvider,
  NotificationDispatcherProvider,
} from './providers';
import { NotificationGateway } from './gateways/notification.gateway';
import { PrismaModule } from '../core/config/prisma/prisma.module';
import { NotificationListener } from './listeners';
import { UserModule } from 'src/user/user.module';
import { QUEUE_NAMES, QUEUE_CONFIG } from './queue.config';
import { EmailProcessor, RealtimeProcessor } from './processors';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    forwardRef(() => UserModule),

    // Register BullMQ queues for notifications
    BullModule.registerQueue(
      {
        name: QUEUE_NAMES.EMAIL,
        defaultJobOptions: QUEUE_CONFIG.email,
      },
      {
        name: QUEUE_NAMES.REALTIME,
        defaultJobOptions: QUEUE_CONFIG.realtime,
      },
    ),
  ],
  controllers: [NotificationsController, TestEmailController],
  providers: [
    // Service (Public API)
    NotificationsService,

    // Repositories
    NotificationRepository,
    NotificationTemplateRepository,
    NotificationPreferenceRepository,

    // Providers
    EmailProvider,
    TemplateRenderingProvider,
    NotificationDispatcherProvider,

    // Gateway
    NotificationGateway,

    // Event Listeners
    NotificationListener,

    // Queue Processors
    EmailProcessor,
    RealtimeProcessor,
  ],
  exports: [NotificationsService, NotificationGateway, NotificationRepository],
})
export class NotificationsModule {}

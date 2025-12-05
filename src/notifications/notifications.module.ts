import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { CacheModule } from '@nestjs/cache-manager';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { NotificationsController } from './notifications.controller';
import { TestEmailController } from './test-email.controller';
import { NotificationsService } from './notifications.service';
import {
  NotificationRepository,
  NotificationTemplateRepository,
  NotificationPreferenceRepository,
} from './repositories';
import { NotificationConfigRepository } from './repositories/notification-config.repository';
import {
  EmailProvider,
  TemplateRenderingProvider,
  NotificationDispatcherProvider,
} from './providers';
import { NotificationGateway } from './gateways/notification.gateway';
import { PrismaModule } from '../core/config/prisma/prisma.module';
import { NotificationListener } from './listeners';
import { UserEventListener } from './listeners/user-event.listener';
import { OrganizationEventListener } from './listeners/organization-event.listener';
import { OrderEventListener } from './listeners/order-event.listener';
import { UserModule } from 'src/user/user.module';
import { QUEUE_NAMES, QUEUE_CONFIG } from './queue.config';
import { EmailProcessor, RealtimeProcessor } from './processors';
import { NotificationConfigService, NotificationManagerService } from './services';
import { EmitEventInterceptor } from './interceptors/emit-event.interceptor';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    CacheModule.register(),
    EventEmitterModule,
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
    // Services (Public API)
    NotificationsService,
    NotificationConfigService,
    NotificationManagerService,

    // Repositories
    NotificationRepository,
    NotificationTemplateRepository,
    NotificationPreferenceRepository,
    NotificationConfigRepository,

    // Providers
    EmailProvider,
    TemplateRenderingProvider,
    NotificationDispatcherProvider,

    // Gateway
    NotificationGateway,

    // Event Listeners (Legacy)
    NotificationListener,

    // Event Listeners (New - Typed Events)
    UserEventListener,
    OrganizationEventListener,
    OrderEventListener,

    // Queue Processors
    EmailProcessor,
    RealtimeProcessor,

    // Global Interceptor for @EmitEvent decorator
    {
      provide: APP_INTERCEPTOR,
      useClass: EmitEventInterceptor,
    },
  ],
  exports: [
    NotificationsService,
    NotificationGateway,
    NotificationRepository,
    NotificationConfigService,
    NotificationManagerService,
  ],
})
export class NotificationsModule {}

import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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

@Module({
  imports: [PrismaModule, ConfigModule, forwardRef(()=> UserModule)],
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
  ],
  exports: [NotificationsService, NotificationGateway, NotificationRepository],
})
export class NotificationsModule {}

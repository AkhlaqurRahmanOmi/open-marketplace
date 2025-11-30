import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from '../notifications.service';
import { NotificationEvent } from '../events';

@Injectable()
export class NotificationListener {
  private readonly logger = new Logger(NotificationListener.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @OnEvent('notification.send', { async: true })
  async handleNotificationSend(event: NotificationEvent) {
    try {
      this.logger.log(
        `📨 Received notification event: ${event.event} for user(s): ${event.userId || event.userIds?.join(', ')}`,
      );

      const results = await this.notificationsService.send({
        userId: event.userId,
        userIds: event.userIds,
        event: event.event,
        channels: event.channels,
        title: event.title,
        message: event.message,
        data: event.data,
        templateName: event.templateName,
      });

      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;

      this.logger.log(
        `✅ Notification sent successfully: ${successCount} succeeded, ${failCount} failed`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to send notification for event ${event.event}:`,
        error.stack,
      );
    }
  }
}

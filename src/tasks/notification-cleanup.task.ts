import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationRepository } from '../notifications/repositories';

/**
 * Scheduled task to cleanup old notifications
 * Archives notifications older than 90 days
 */
@Injectable()
export class NotificationCleanupTask {
  private readonly logger = new Logger(NotificationCleanupTask.name);

  constructor(
    private readonly notificationRepository: NotificationRepository,
  ) {}

  /**
   * Archive old notifications (90+ days)
   * Runs every day at 3:00 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async archiveOldNotifications() {
    this.logger.log('Starting notification archive task...');

    try {
      // Archive notifications older than 90 days
      const archivedCount = await this.notificationRepository.archiveOldNotifications(90);

      this.logger.log(
        `Notification archive completed. Archived ${archivedCount} old notification records`,
      );
    } catch (error) {
      this.logger.error(
        `Notification archive failed: ${error.message}`,
        error.stack,
      );
    }
  }
}

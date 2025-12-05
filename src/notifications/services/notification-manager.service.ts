import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NotificationChannel } from '@prisma/client';
import { QUEUE_NAMES } from '../queue.config';
import { NotificationConfigService } from './notification-config.service';

export interface SendNotificationPayload {
  userId?: number;
  userIds?: number[];
  channels?: NotificationChannel[];
  template?: string;
  data: Record<string, any>;
  priority?: 'HIGH' | 'NORMAL' | 'LOW';
}

export interface BatchNotificationPayload extends SendNotificationPayload {
  userId: number;
}

@Injectable()
export class NotificationManagerService {
  private readonly logger = new Logger(NotificationManagerService.name);

  constructor(
    private readonly configService: NotificationConfigService,
    @InjectQueue(QUEUE_NAMES.EMAIL) private emailQueue: Queue,
    @InjectQueue(QUEUE_NAMES.REALTIME) private realtimeQueue: Queue,
  ) {}

  /**
   * Send notification based on event configuration
   */
  async sendForEvent(
    eventName: string,
    payload: SendNotificationPayload,
  ): Promise<void> {
    try {
      // Get config for this event
      const config = await this.configService.getConfigWithDefaults(eventName);

      if (!config.enabled) {
        this.logger.debug(`Notifications disabled for event: ${eventName}`);
        return;
      }

      // Evaluate conditions
      if (config.conditions && !this.configService.evaluateConditions(config as any, payload.data)) {
        this.logger.debug(
          `Conditions not met for event ${eventName}, skipping notification`,
        );
        return;
      }

      // Use config channels if not explicitly provided
      const channels = payload.channels || config.channels || [NotificationChannel.email];
      const template = payload.template || config.template || 'default';
      const priority = (payload.priority || config.priority || 'NORMAL') as 'HIGH' | 'NORMAL' | 'LOW';

      // Send to each channel
      for (const channel of channels) {
        await this.sendToChannel(
          channel,
          eventName,
          {
            ...payload,
            template,
            priority,
          },
        );
      }

      this.logger.log(
        `Notifications queued for event ${eventName} on channels: ${channels.join(', ')}`,
      );
    } catch (error) {
      this.logger.error(`Failed to send notification for event ${eventName}:`, error.stack);
      throw error;
    }
  }

  /**
   * Send batch notifications (e.g., bulk invites)
   */
  async sendBatch(
    eventName: string,
    payloads: BatchNotificationPayload[],
  ): Promise<void> {
    try {
      const config = await this.configService.getConfigWithDefaults(eventName);

      if (!config.enabled) {
        this.logger.debug(`Notifications disabled for event: ${eventName}`);
        return;
      }

      // Process in batches to avoid overwhelming the queue
      const batchSize = (config.metadata as any)?.batching?.size || 10;

      for (let i = 0; i < payloads.length; i += batchSize) {
        const batch = payloads.slice(i, i + batchSize);

        await Promise.all(
          batch.map((payload) =>
            this.sendForEvent(eventName, payload),
          ),
        );

        // Small delay between batches
        if (i + batchSize < payloads.length) {
          await this.delay(100);
        }
      }

      this.logger.log(
        `Batch notifications queued: ${payloads.length} notifications for event ${eventName}`,
      );
    } catch (error) {
      this.logger.error(`Failed to send batch notifications for ${eventName}:`, error.stack);
      throw error;
    }
  }

  /**
   * Send notification to a specific channel
   */
  private async sendToChannel(
    channel: NotificationChannel,
    event: string,
    payload: SendNotificationPayload,
  ): Promise<void> {
    const jobData = {
      event,
      ...payload,
      userId: payload.userId,
      userIds: payload.userIds,
      data: payload.data,
      template: payload.template,
    };

    const jobOptions = {
      priority: this.getPriorityValue(payload.priority || 'NORMAL'),
    };

    switch (channel) {
      case NotificationChannel.email:
        await this.emailQueue.add('send-email', jobData, jobOptions);
        break;

      case NotificationChannel.realtime:
      case NotificationChannel.in_app:
        await this.realtimeQueue.add('send-realtime', jobData, jobOptions);
        break;

      case NotificationChannel.sms:
        // TODO: Implement SMS queue
        this.logger.warn('SMS channel not yet implemented');
        break;

      case NotificationChannel.push:
        // TODO: Implement Push notification queue
        this.logger.warn('Push notification channel not yet implemented');
        break;

      default:
        this.logger.warn(`Unknown notification channel: ${channel}`);
    }
  }

  /**
   * Convert priority string to numeric value for queue
   */
  private getPriorityValue(priority: string): number {
    switch (priority) {
      case 'HIGH':
        return 1;
      case 'NORMAL':
        return 5;
      case 'LOW':
        return 10;
      default:
        return 5;
    }
  }

  /**
   * Simple delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

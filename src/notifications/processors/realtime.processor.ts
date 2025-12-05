import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { QUEUE_NAMES } from '../queue.config';
import { NotificationGateway } from '../gateways/notification.gateway';
import { NotificationRepository } from '../repositories/notification.repository';
import { TemplateRenderingProvider } from '../providers/template-rendering.provider';
import { NotificationTemplateRepository } from '../repositories/notification-template.repository';
import { NotificationStatus, NotificationChannel } from '../enums';

interface RealtimeJobData {
  userId?: number;
  userIds?: number[];
  event: string;
  title?: string;
  message?: string;
  templateName?: string;
  data?: any;
}

@Processor(QUEUE_NAMES.REALTIME)
export class RealtimeProcessor extends WorkerHost {
  private readonly logger = new Logger(RealtimeProcessor.name);

  constructor(
    private readonly gateway: NotificationGateway,
    private readonly notificationRepo: NotificationRepository,
    private readonly templateRenderer: TemplateRenderingProvider,
    private readonly templateRepo: NotificationTemplateRepository,
  ) {
    super();
  }

  async process(job: Job<RealtimeJobData>): Promise<void> {
    this.logger.log(`Processing realtime job ${job.id} for event: ${job.data.event}`);

    const userIds = job.data.userIds || (job.data.userId ? [job.data.userId] : []);

    for (const userId of userIds) {
      try {
        await this.sendToUser(userId, job.data);
      } catch (error) {
        this.logger.error(
          `Failed to send realtime notification to user ${userId}: ${error.message}`
        );
        // Don't throw - realtime notifications don't retry
      }
    }
  }

  private async sendToUser(userId: number, data: RealtimeJobData) {
    // Prepare content
    let message = data.message || '';

    if (data.templateName) {
      const template = await this.templateRepo.findByName(data.templateName);
      if (template && template.channel === 'realtime') {
        message = this.templateRenderer.render(template.template, data.data || {});
      }
    } else if (!data.message) {
      // Try to find template by event
      const template = await this.templateRepo.findByEventAndChannel(
        data.event,
        'realtime' as any
      );

      if (template) {
        message = this.templateRenderer.render(template.template, data.data || {});
      }
    }

    // Create notification record
    const notification = await this.notificationRepo.create({
      userId,
      event: data.event,
      channel: 'realtime' as any,
      title: data.title,
      message,
      data: data.data,
      status: NotificationStatus.SENT,
    });

    // Send via WebSocket
    this.gateway.sendToUser(userId, {
      id: notification.id,
      userId: notification.userId,
      event: notification.event,
      channel: NotificationChannel.REALTIME,
      title: notification.title || undefined,
      message: notification.message,
      data: notification.data,
      createdAt: notification.createdAt,
    });

    this.logger.log(`Realtime notification sent to user ${userId}`);
  }
}

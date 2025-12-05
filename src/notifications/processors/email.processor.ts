import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { QUEUE_NAMES } from '../queue.config';
import { EmailProvider } from '../providers/email.provider';
import { TemplateRenderingProvider } from '../providers/template-rendering.provider';
import { NotificationTemplateRepository } from '../repositories/notification-template.repository';
import { NotificationRepository } from '../repositories/notification.repository';
import { UserService } from 'src/user/user.service';
import { NotificationStatus } from '../enums';

interface EmailJobData {
  userId?: number;
  userIds?: number[];
  event: string;
  title?: string;
  message?: string;
  templateName?: string;
  data?: any;
}

@Processor(QUEUE_NAMES.EMAIL)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    private readonly emailProvider: EmailProvider,
    private readonly templateRenderer: TemplateRenderingProvider,
    private readonly templateRepo: NotificationTemplateRepository,
    private readonly notificationRepo: NotificationRepository,
    private readonly userService: UserService,
  ) {
    super();
  }

  async process(job: Job<EmailJobData>): Promise<void> {
    this.logger.log(
      `Processing email job ${job.id} for event: ${job.data.event} (attempt ${job.attemptsMade + 1}/${job.opts.attempts})`
    );

    const userIds = job.data.userIds || (job.data.userId ? [job.data.userId] : []);

    for (const userId of userIds) {
      try {
        await this.sendToUser(userId, job.data);
      } catch (error) {
        this.logger.error(
          `Failed to send email to user ${userId}: ${error.message}`
        );

        // Only throw if it's not the last attempt
        if (job.attemptsMade < (job.opts.attempts || 3) - 1) {
          throw error; // Will retry
        } else {
          this.logger.error(
            `Giving up on user ${userId} after ${job.opts.attempts} attempts`
          );
        }
      }
    }
  }

  private async sendToUser(userId: number, data: EmailJobData) {
    // Get user
    const user = await this.userService.findOne(userId);
    if (!user?.email) {
      this.logger.warn(`No email found for user ${userId}`);
      return;
    }

    // Prepare content
    let subject = data.title || 'Notification';
    let body = data.message || '';

    if (data.templateName) {
      const template = await this.templateRepo.findByName(data.templateName);
      if (template && template.channel === 'email') {
        const rendered = this.templateRenderer.renderWithSubject(
          template.subject || subject,
          template.template,
          data.data || {}
        );
        subject = rendered.subject;
        body = rendered.body;
      }
    } else if (!data.message) {
      // Try to find template by event
      const template = await this.templateRepo.findByEventAndChannel(
        data.event,
        'email' as any
      );

      if (template) {
        const rendered = this.templateRenderer.renderWithSubject(
          template.subject || subject,
          template.template,
          data.data || {}
        );
        subject = rendered.subject;
        body = rendered.body;
      }
    }

    // Create notification record
    const notification = await this.notificationRepo.create({
      userId,
      event: data.event,
      channel: 'email' as any,
      title: subject,
      message: body,
      data: data.data,
      status: NotificationStatus.PENDING,
    });

    try {
      // Send email
      const success = await this.emailProvider.sendEmail({
        to: user.email,
        subject,
        html: body,
      });

      if (!success) {
        throw new Error('Email provider returned failure');
      }

      // Update status
      await this.notificationRepo.updateStatus(
        notification.id,
        NotificationStatus.SENT
      );

      this.logger.log(`Email sent to ${user.email} for event ${data.event}`);
    } catch (error) {
      // Update notification status to failed
      await this.notificationRepo.updateStatus(
        notification.id,
        NotificationStatus.FAILED
      );
      throw error;
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel as PrismaNotificationChannel } from '@prisma/client';
import { NotificationChannel, NotificationStatus } from '../enums';
import {
  NotificationRepository,
  NotificationTemplateRepository,
  NotificationPreferenceRepository,
} from '../repositories';
import { EmailProvider } from './email.provider';
import { TemplateRenderingProvider } from './template-rendering.provider';
import { NotificationGateway } from '../gateways/notification.gateway';
import { SendNotificationDto } from '../dtos';
import { UserService } from 'src/user/user.service';

export interface DispatchResult {
  channel: NotificationChannel;
  success: boolean;
  notificationId?: number;
  error?: string;
}

@Injectable()
export class NotificationDispatcherProvider {
  private readonly logger = new Logger(NotificationDispatcherProvider.name);

  constructor(
    private readonly notificationRepo: NotificationRepository,
    private readonly templateRepo: NotificationTemplateRepository,
    private readonly preferenceRepo: NotificationPreferenceRepository,
    private readonly userService: UserService,
    private readonly emailProvider: EmailProvider,
    private readonly templateRenderer: TemplateRenderingProvider,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async dispatch(dto: SendNotificationDto): Promise<DispatchResult[]> {
    const results: DispatchResult[] = [];

    // Determine recipients
    const userIds = dto.userIds || (dto.userId ? [dto.userId] : []);

    if (userIds.length === 0) {
      this.logger.warn('No recipients specified for notification dispatch');
      return results;
    }

    // Critical events that bypass user preferences
    const isCriticalEvent = this.isCriticalEvent(dto.event);

    // Dispatch to each channel
    for (const channel of dto.channels) {
      // Filter users based on their preferences (skip for critical events)
      const enabledUserIds = isCriticalEvent
        ? userIds
        : await this.filterByPreferences(userIds, dto.event, channel);

      if (enabledUserIds.length === 0) {
        this.logger.debug(
          `No users have ${channel} notifications enabled for event ${dto.event}`,
        );
        continue;
      }

      // Dispatch based on channel type
      switch (channel) {
        case NotificationChannel.EMAIL:
          const emailResults = await this.dispatchEmail(dto, enabledUserIds);
          results.push(...emailResults);
          break;

        case NotificationChannel.REALTIME:
          const realtimeResults = await this.dispatchRealtime(dto, enabledUserIds);
          results.push(...realtimeResults);
          break;

        case NotificationChannel.SMS:
          this.logger.warn('SMS notifications are not yet implemented');
          results.push({
            channel: NotificationChannel.SMS,
            success: false,
            error: 'SMS channel not implemented',
          });
          break;

        case NotificationChannel.PUSH:
          this.logger.warn('Push notifications are not yet implemented');
          results.push({
            channel: NotificationChannel.PUSH,
            success: false,
            error: 'Push channel not implemented',
          });
          break;

        default:
          this.logger.error(`Unknown notification channel: ${channel}`);
      }
    }

    return results;
  }

  /**
   * Check if event is critical and should bypass user preferences
   */
  private isCriticalEvent(event: string): boolean {
    const criticalEvents = [
      'user.otp.requested',
      'user.password.reset.requested',
    ];

    return criticalEvents.includes(event);
  }

  private async filterByPreferences(
    userIds: number[],
    event: string,
    channel: NotificationChannel,
  ): Promise<number[]> {
    const enabledUserIds: number[] = [];

    for (const userId of userIds) {
      const isEnabled = await this.preferenceRepo.isChannelEnabledForUser(
        userId,
        event,
        channel as unknown as PrismaNotificationChannel,
      );

      if (isEnabled) {
        enabledUserIds.push(userId);
      }
    }

    return enabledUserIds;
  }

  private async dispatchEmail(
    dto: SendNotificationDto,
    userIds: number[],
  ): Promise<DispatchResult[]> {
    const results: DispatchResult[] = [];

    try {
      const { subject, body } = await this.prepareEmailContent(dto);

      // Process each recipient
      for (const userId of userIds) {
        const result = await this.sendEmailToUser(userId, dto, subject, body);
        results.push(result);
      }
    } catch (error) {
      this.logger.error('Email dispatch failed:', error);
      results.push({
        channel: NotificationChannel.EMAIL,
        success: false,
        error: error?.message ?? String(error),
      });
    }

    return results;
  }

  /**
   * Prepare email subject and body from template or DTO
   */
  private async prepareEmailContent(
    dto: SendNotificationDto,
  ): Promise<{ subject: string; body: string }> {
    let subject = dto.title || 'Notification';
    let body = dto.message || '';

    if (dto.templateName) {
      const template = await this.templateRepo.findByName(dto.templateName);

      if (template && template.channel === 'email') {
        const rendered = this.templateRenderer.renderWithSubject(
          template.subject,
          template.template,
          dto.data || {},
        );
        subject = rendered.subject;
        body = rendered.body;
      }
    } else if (!dto.message) {
      // Try to find template by event
      const template = await this.templateRepo.findByEventAndChannel(
        dto.event,
        'email' as PrismaNotificationChannel,
      );

      if (template) {
        const rendered = this.templateRenderer.renderWithSubject(
          template.subject,
          template.template,
          dto.data || {},
        );
        subject = rendered.subject;
        body = rendered.body;
      }
    }

    return { subject, body };
  }

  /**
   * Send email to a single user
   */
  private async sendEmailToUser(
    userId: number,
    dto: SendNotificationDto,
    subject: string,
    body: string,
  ): Promise<DispatchResult> {
    // Create notification record as pending
    const notification = await this.notificationRepo.create({
      userId,
      event: dto.event,
      channel: 'email' as PrismaNotificationChannel,
      title: subject,
      message: body,
      data: dto.data,
      status: NotificationStatus.PENDING,
    });

    // Fetch user details (must have email in production)
    let user;
    try {
      user = await this.userService.findOne(userId);
    } catch (err) {
      this.logger.error(
        `Failed to fetch user ${userId}: ${err?.message ?? err}`,
      );
    }

    if (!user || !user.email) {
      const errMsg = 'No email address found for user';
      this.logger.warn(`${errMsg} - userId=${userId}`);
      await this.notificationRepo.updateStatus(
        notification.id,
        NotificationStatus.FAILED,
      );

      return {
        channel: NotificationChannel.EMAIL,
        success: false,
        notificationId: notification.id,
        error: errMsg,
      };
    }

    // Send email via provider - CRITICAL: Check return value
    try {
      const emailSent = await this.emailProvider.sendEmail({
        to: user.email,
        subject,
        html: body,
      });

      if (!emailSent) {
        throw new Error('Email provider returned failure status');
      }

      this.logger.log(
        `Email sent successfully to ${user.email} for event ${dto.event}`,
      );

      // Update notification status - wrap in try-catch to not fail if status update fails
      try {
        await this.notificationRepo.updateStatus(
          notification.id,
          NotificationStatus.SENT,
        );
      } catch (statusError) {
        this.logger.warn(
          `Email sent to ${user.email} but failed to update notification status: ${statusError.message}`,
        );
        // Still report success since email was delivered
      }

      return {
        channel: NotificationChannel.EMAIL,
        success: true,
        notificationId: notification.id,
      };
    } catch (err) {
      const errMsg = err?.message ? String(err.message) : String(err);
      this.logger.error(`Failed to send email to ${user.email}: ${errMsg}`);

      // Try to update status to failed
      try {
        await this.notificationRepo.updateStatus(
          notification.id,
          NotificationStatus.FAILED,
        );
      } catch (statusError) {
        this.logger.warn(
          `Failed to update notification status to FAILED: ${statusError.message}`,
        );
      }

      return {
        channel: NotificationChannel.EMAIL,
        success: false,
        notificationId: notification.id,
        error: errMsg,
      };
    }
  }

  private async dispatchRealtime(
    dto: SendNotificationDto,
    userIds: number[],
  ): Promise<DispatchResult[]> {
    const results: DispatchResult[] = [];

    try {
      // Get or use template
      let message = dto.message || '';

      if (dto.templateName) {
        const template = await this.templateRepo.findByName(dto.templateName);

        if (template && template.channel === 'realtime') {
          message = this.templateRenderer.render(template.template, dto.data || {});
        }
      } else if (!dto.message) {
        // Try to find template by event
        const template = await this.templateRepo.findByEventAndChannel(
          dto.event,
          'realtime' as PrismaNotificationChannel,
        );

        if (template) {
          message = this.templateRenderer.render(template.template, dto.data || {});
        }
      }

      for (const userId of userIds) {
        // Create notification record
        const notification = await this.notificationRepo.create({
          userId,
          event: dto.event,
          channel: 'realtime' as PrismaNotificationChannel,
          title: dto.title,
          message,
          data: dto.data,
          status: NotificationStatus.SENT,
        });

        // Send via WebSocket
        this.notificationGateway.sendToUser(userId, {
          id: notification.id,
          userId: notification.userId,
          event: notification.event,
          channel: NotificationChannel.REALTIME,
          title: notification.title || undefined,
          message: notification.message,
          data: notification.data,
          createdAt: notification.createdAt,
        });

        results.push({
          channel: NotificationChannel.REALTIME,
          success: true,
          notificationId: notification.id,
        });
      }
    } catch (error) {
      this.logger.error('Realtime dispatch failed:', error);
      results.push({
        channel: NotificationChannel.REALTIME,
        success: false,
        error: error.message,
      });
    }

    return results;
  }
}

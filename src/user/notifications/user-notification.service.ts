import { Injectable } from '@nestjs/common';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationChannel } from '../../notifications/enums';
import { UserNotificationEvents } from './events/user-notification.events';

@Injectable()
export class UserNotificationService {
  constructor(
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Send OTP email - CRITICAL (Synchronous)
   * User must receive OTP to verify account
   */
  async sendOTPEmail(
    userId: number,
    email: string,
    otp: string,
    expiryMinutes: number = 10,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const results = await this.notificationsService.send({
        userId,
        event: UserNotificationEvents.OTP_REQUESTED,
        channels: [NotificationChannel.EMAIL],
        templateName: 'otp-email',
        data: {
          otp,
          expiryMinutes,
          email,
        },
      });

      // Check if email was sent successfully
      const emailResult = results.find(
        (r) => r.channel === NotificationChannel.EMAIL,
      );

      return {
        success: emailResult?.success || false,
        error: emailResult?.error,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send welcome email - NON-CRITICAL (Can be async later)
   */
  async sendWelcomeEmail(
    userId: number,
    email: string,
    name: string,
  ): Promise<{ success: boolean }> {
    try {
      const results = await this.notificationsService.send({
        userId,
        event: UserNotificationEvents.USER_REGISTERED,
        channels: [NotificationChannel.EMAIL],
        templateName: 'welcome-email',
        data: { name, email },
      });

      return { success: results.some((r) => r.success) };
    } catch (error) {
      return { success: false };
    }
  }

  /**
   * Send account verified email - NON-CRITICAL
   */
  async sendAccountVerifiedEmail(
    userId: number,
    email: string,
    name: string,
  ): Promise<{ success: boolean }> {
    try {
      const results = await this.notificationsService.send({
        userId,
        event: UserNotificationEvents.USER_VERIFIED,
        channels: [NotificationChannel.EMAIL],
        templateName: 'account-verified',
        data: { name, email },
      });

      return { success: results.some((r) => r.success) };
    } catch (error) {
      return { success: false };
    }
  }

  /**
   * Send password reset email - CRITICAL (Synchronous)
   */
  async sendPasswordResetEmail(
    userId: number,
    email: string,
    resetToken: string,
    expiryMinutes: number = 30,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

      const results = await this.notificationsService.send({
        userId,
        event: UserNotificationEvents.PASSWORD_RESET_REQUESTED,
        channels: [NotificationChannel.EMAIL],
        templateName: 'password-reset',
        data: {
          resetLink,
          resetToken,
          email,
          expiryMinutes,
        },
      });

      const emailResult = results.find(
        (r) => r.channel === NotificationChannel.EMAIL,
      );

      return {
        success: emailResult?.success || false,
        error: emailResult?.error,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async deleteUserNotifications(userId: number): Promise<{ deleted: number }> {
    return this.notificationsService.deleteUserNotifications(userId);
  }
}

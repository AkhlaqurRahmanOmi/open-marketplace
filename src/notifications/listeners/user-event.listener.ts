import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  UserRegisteredEvent,
  UserVerifiedEvent,
  PasswordResetRequestedEvent,
} from '../events/user.events';
import { NotificationManagerService } from '../services/notification-manager.service';

@Injectable()
export class UserEventListener {
  private readonly logger = new Logger(UserEventListener.name);

  constructor(private readonly notificationManager: NotificationManagerService) {}

  @OnEvent('user.registered', { async: true })
  async handleUserRegistered(event: UserRegisteredEvent) {
    try {
      this.logger.log(
        `Handling user.registered event for user ${event.userId} [traceId: ${event.traceId}]`,
      );

      await this.notificationManager.sendForEvent('user.registered', {
        userId: event.userId,
        data: {
          userId: event.userId,
          email: event.email,
          name: event.name,
          otp: event.otp,
          expiryMinutes: 10,
        },
      });

      this.logger.log(`✅ User registered notification sent for user ${event.userId}`);
    } catch (error) {
      this.logger.error(
        `❌ Failed to send user registered notification for user ${event.userId}:`,
        error.stack,
      );
    }
  }

  @OnEvent('user.verified', { async: true })
  async handleUserVerified(event: UserVerifiedEvent) {
    try {
      this.logger.log(
        `Handling user.verified event for user ${event.userId} [traceId: ${event.traceId}]`,
      );

      await this.notificationManager.sendForEvent('user.verified', {
        userId: event.userId,
        data: {
          userId: event.userId,
          email: event.email,
          name: event.name,
        },
      });

      this.logger.log(`✅ User verified notification sent for user ${event.userId}`);
    } catch (error) {
      this.logger.error(
        `❌ Failed to send user verified notification for user ${event.userId}:`,
        error.stack,
      );
    }
  }

  @OnEvent('password.reset.requested', { async: true })
  async handlePasswordResetRequested(event: PasswordResetRequestedEvent) {
    try {
      this.logger.log(
        `Handling password.reset.requested event for user ${event.userId} [traceId: ${event.traceId}]`,
      );

      const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${event.resetToken}`;

      await this.notificationManager.sendForEvent('password.reset.requested', {
        userId: event.userId,
        data: {
          userId: event.userId,
          email: event.email,
          resetToken: event.resetToken,
          resetLink,
          expiryMinutes: 30,
        },
      });

      this.logger.log(`✅ Password reset notification sent for user ${event.userId}`);
    } catch (error) {
      this.logger.error(
        `❌ Failed to send password reset notification for user ${event.userId}:`,
        error.stack,
      );
    }
  }
}

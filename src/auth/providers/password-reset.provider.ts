import {
    Injectable,
    BadRequestException,
    NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { hash } from 'bcrypt';
import { PasswordResetTokenRepository } from '../repositories/password-reset-token.repository';
import { PrismaService } from '../../core/config/prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationChannel } from '../../notifications/enums';

@Injectable()
export class PasswordResetProvider {
    // Token expires in 1 hour
    private readonly TOKEN_EXPIRY_HOURS = 1;
    private readonly BCRYPT_ROUNDS = 10;

    constructor(
        private readonly passwordResetTokenRepo: PasswordResetTokenRepository,
        private readonly prisma: PrismaService,
        private readonly notificationsService: NotificationsService,
    ) {}

    /**
     * Request password reset - generates token and sends email
     */
    async requestPasswordReset(email: string): Promise<void> {
        // Find user by email
        const user = await this.prisma.user.findUnique({
            where: { email },
        });

        // Always return success even if user doesn't exist (security best practice)
        if (!user) {
            return;
        }

        // Invalidate any existing tokens for this user
        await this.passwordResetTokenRepo.invalidateUserTokens(user.id);

        // Generate a secure random token
        const token = randomBytes(32).toString('hex');

        // Calculate expiry time
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + this.TOKEN_EXPIRY_HOURS);

        // Save token to database
        await this.passwordResetTokenRepo.create({
            userId: user.id,
            token,
            expiresAt,
        });

        // Send password reset email
        await this.notificationsService.send({
            userId: user.id,
            event: 'PASSWORD_RESET',
            channels: [NotificationChannel.EMAIL],
            title: 'Password Reset Request',
            message: `You requested a password reset. Use the token: ${token}`,
            data: {
                token,
                expiresAt: expiresAt.toISOString(),
                resetLink: `${process.env.FRONTEND_URL}/reset-password?token=${token}`,
            },
        });
    }

    /**
     * Reset password using token
     */
    async resetPassword(token: string, newPassword: string): Promise<void> {
        // Find valid token
        const resetToken = await this.passwordResetTokenRepo.findValidToken(token);

        if (!resetToken) {
            throw new BadRequestException(
                'Invalid or expired password reset token',
            );
        }

        // Hash new password
        const hashedPassword = await hash(newPassword, this.BCRYPT_ROUNDS);

        // Update user password
        await this.prisma.user.update({
            where: { id: resetToken.userId },
            data: { password: hashedPassword },
        });

        // Mark token as used
        await this.passwordResetTokenRepo.markAsUsed(resetToken.id);

        // Send confirmation email
        await this.notificationsService.send({
            userId: resetToken.userId,
            event: 'PASSWORD_CHANGED',
            channels: [NotificationChannel.EMAIL],
            title: 'Password Changed Successfully',
            message: 'Your password has been changed successfully.',
            data: {
                changedAt: new Date().toISOString(),
            },
        });
    }

    /**
     * Verify if a token is valid
     */
    async verifyToken(token: string): Promise<boolean> {
        const resetToken = await this.passwordResetTokenRepo.findValidToken(token);
        return !!resetToken;
    }

    /**
     * Generate random password for guest users
     */
    generateRandomPassword(length: number = 16): string {
        const charset =
            'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let password = '';
        const randomValues = randomBytes(length);

        for (let i = 0; i < length; i++) {
            password += charset[randomValues[i] % charset.length];
        }

        return password;
    }

    /**
     * Create account with random password and send reset link
     * (For guest checkout flow)
     */
    async createGuestAccountWithReset(data: {
        email: string;
        firstName?: string;
        lastName?: string;
    }): Promise<{ userId: number; resetToken: string }> {
        // Generate random password
        const randomPassword = this.generateRandomPassword();
        const hashedPassword = await hash(randomPassword, this.BCRYPT_ROUNDS);

        // Create user
        const user = await this.prisma.user.create({
            data: {
                email: data.email,
                password: hashedPassword,
                firstName: data.firstName || '',
                lastName: data.lastName || '',
                isVerified: false,
            },
        });

        // Generate password reset token
        const token = randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours for first-time setup

        await this.passwordResetTokenRepo.create({
            userId: user.id,
            token,
            expiresAt,
        });

        // Send welcome email with password reset link
        await this.notificationsService.send({
            userId: user.id,
            event: 'WELCOME',
            channels: [NotificationChannel.EMAIL],
            title: 'Welcome! Set Your Password',
            message: `Your account has been created. Please set your password using the link below.`,
            data: {
                token,
                expiresAt: expiresAt.toISOString(),
                resetLink: `${process.env.FRONTEND_URL}/set-password?token=${token}`,
            },
        });

        return { userId: user.id, resetToken: token };
    }

    /**
     * Cleanup expired tokens (can be run as a cron job)
     */
    async cleanupExpiredTokens(): Promise<number> {
        return this.passwordResetTokenRepo.deleteExpired();
    }
}

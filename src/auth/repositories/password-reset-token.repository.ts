import { Injectable } from '@nestjs/common';
import { PasswordResetToken } from '@prisma/client';
import { PrismaService } from '../../core/config/prisma/prisma.service';

@Injectable()
export class PasswordResetTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new password reset token
   */
  async create(data: {
    userId: number;
    token: string;
    expiresAt: Date;
  }): Promise<PasswordResetToken> {
    return this.prisma.passwordResetToken.create({
      data,
    });
  }

  /**
   * Find a valid (unused and not expired) token
   */
  async findValidToken(token: string): Promise<PasswordResetToken | null> {
    return this.prisma.passwordResetToken.findFirst({
      where: {
        token,
        isUsed: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * Mark token as used
   */
  async markAsUsed(id: number): Promise<void> {
    await this.prisma.passwordResetToken.update({
      where: { id },
      data: {
        isUsed: true,
        usedAt: new Date(),
      },
    });
  }

  /**
   * Invalidate all existing tokens for a user
   */
  async invalidateUserTokens(userId: number): Promise<void> {
    await this.prisma.passwordResetToken.updateMany({
      where: {
        userId,
        isUsed: false,
      },
      data: {
        isUsed: true,
        usedAt: new Date(),
      },
    });
  }

  /**
   * Delete expired tokens (cleanup)
   */
  async deleteExpired(): Promise<number> {
    const result = await this.prisma.passwordResetToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return result.count;
  }

  /**
   * Find token by user ID
   */
  async findByUserId(userId: number): Promise<PasswordResetToken[]> {
    return this.prisma.passwordResetToken.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}

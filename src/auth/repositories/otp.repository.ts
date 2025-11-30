import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/config/prisma/prisma.service';
import { Otp } from '@prisma/client';

@Injectable()
export class OtpRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new OTP record
   */
  async create(data: {
    userId: number;
    code: string;
    type: string;
    expiresAt: Date;
  }): Promise<Otp> {
    return this.prisma.otp.create({
      data,
    });
  }

  /**
   * Find the latest valid OTP for a user by type
   */
  async findLatestByUserIdAndType(
    userId: number,
    type: string,
  ): Promise<Otp | null> {
    return this.prisma.otp.findFirst({
      where: {
        userId,
        type,
        isUsed: false,
        expiresAt: {
          gte: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Find OTP by code and type (for verification)
   */
  async findByCodeAndType(code: string, type: string): Promise<Otp | null> {
    return this.prisma.otp.findFirst({
      where: {
        code,
        type,
        isUsed: false,
        expiresAt: {
          gte: new Date(),
        },
      },
    });
  }

  /**
   * Increment attempt count
   */
  async incrementAttempts(id: number): Promise<Otp> {
    return this.prisma.otp.update({
      where: { id },
      data: {
        attempts: {
          increment: 1,
        },
      },
    });
  }

  /**
   * Mark OTP as used
   */
  async markAsUsed(id: number): Promise<Otp> {
    return this.prisma.otp.update({
      where: { id },
      data: {
        isUsed: true,
        usedAt: new Date(),
      },
    });
  }

  /**
   * Invalidate all unused OTPs for a user by type
   */
  async invalidateAllByUserIdAndType(
    userId: number,
    type: string,
  ): Promise<number> {
    const result = await this.prisma.otp.updateMany({
      where: {
        userId,
        type,
        isUsed: false,
      },
      data: {
        isUsed: true,
        usedAt: new Date(),
      },
    });

    return result.count;
  }

  /**
   * Delete expired OTPs (cleanup job)
   */
  async deleteExpired(): Promise<number> {
    const result = await this.prisma.otp.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return result.count;
  }

  /**
   * Get OTP count for user (to check resend cooldown)
   */
  async getRecentOtpCount(
    userId: number,
    type: string,
    minutesAgo: number,
  ): Promise<number> {
    const since = new Date(Date.now() - minutesAgo * 60 * 1000);

    return this.prisma.otp.count({
      where: {
        userId,
        type,
        createdAt: {
          gte: since,
        },
      },
    });
  }
}

import { Injectable } from '@nestjs/common';
import { Notification, NotificationChannel } from '@prisma/client';
import { PrismaService } from '../../core/config/prisma/prisma.service';
import { NotificationFilterDto } from '../dtos';
import { NotificationStatus } from '../enums';
import { PaginatedResult } from '../../shared/types';

@Injectable()
export class NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    userId: number;
    event: string;
    channel: NotificationChannel;
    title?: string;
    message: string;
    data?: any;
    status?: string;
  }): Promise<Notification> {
    return this.prisma.notification.create({
      data: {
        userId: data.userId,
        event: data.event,
        channel: data.channel,
        title: data.title,
        message: data.message,
        data: data.data,
        status: data.status || NotificationStatus.PENDING,
      },
    });
  }

  async findById(id: number): Promise<Notification | null> {
    return this.prisma.notification.findUnique({
      where: { id },
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

  async findByUserId(userId: number): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findWithFilters(
    filterDto: NotificationFilterDto,
  ): Promise<PaginatedResult<Notification>> {
    const { userId, event, channel, status, startDate, endDate, page = 1, limit = 20 } = filterDto;

    const where: any = {};

    if (userId) where.userId = userId;
    if (event) where.event = event;
    if (channel) where.channel = channel;
    if (status) where.status = status;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
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
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  async findUnreadByUserId(userId: number): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      where: {
        userId,
        readAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async countUnreadByUserId(userId: number): Promise<number> {
    return this.prisma.notification.count({
      where: {
        userId,
        readAt: null,
      },
    });
  }

  async markAsRead(id: number): Promise<Notification> {
    return this.prisma.notification.update({
      where: { id },
      data: {
        readAt: new Date(),
        status: NotificationStatus.READ,
      },
    });
  }

  async markMultipleAsRead(ids: number[]): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: { id: { in: ids } },
      data: {
        readAt: new Date(),
        status: NotificationStatus.READ,
      },
    });
    return result.count;
  }

  async markAllAsReadForUser(userId: number): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        readAt: null,
      },
      data: {
        readAt: new Date(),
        status: NotificationStatus.READ,
      },
    });
    return result.count;
  }

  async updateStatus(id: number, status: NotificationStatus): Promise<Notification> {
    return this.prisma.notification.update({
      where: { id },
      data: {
        status,
        ...(status === NotificationStatus.SENT && { sentAt: new Date() }),
      },
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.notification.delete({
      where: { id },
    });
  }

  async deleteMultiple(ids: number[]): Promise<number> {
    const result = await this.prisma.notification.deleteMany({
      where: { id: { in: ids } },
    });
    return result.count;
  }

  async deleteByUserId(userId: number): Promise<number> {
    const result = await this.prisma.notification.deleteMany({
      where: { userId: userId },
    });
    return result.count;
  }

  async archiveOldNotifications(daysOld: number): Promise<number> {
    const date = new Date();
    date.setDate(date.getDate() - daysOld);

    const result = await this.prisma.notification.updateMany({
      where: {
        createdAt: { lt: date },
        status: { not: NotificationStatus.ARCHIVED },
      },
      data: {
        status: NotificationStatus.ARCHIVED,
      },
    });
    return result.count;
  }
}

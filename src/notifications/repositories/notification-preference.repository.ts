import { Injectable } from '@nestjs/common';
import { NotificationPreference, NotificationChannel } from '@prisma/client';
import { PrismaService } from '../../core/config/prisma/prisma.service';
import { UpdatePreferenceDto } from '../dtos';

@Injectable()
export class NotificationPreferenceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(data: UpdatePreferenceDto): Promise<NotificationPreference> {
    return this.prisma.notificationPreference.upsert({
      where: {
        userId_event_channel: {
          userId: data.userId,
          event: data.event,
          channel: data.channel as NotificationChannel,
        },
      },
      create: {
        userId: data.userId,
        event: data.event,
        channel: data.channel as NotificationChannel,
        enabled: data.enabled,
      },
      update: {
        enabled: data.enabled,
        updatedAt: new Date(),
      },
    });
  }

  async findByUserId(userId: number): Promise<NotificationPreference[]> {
    return this.prisma.notificationPreference.findMany({
      where: { userId },
      orderBy: [{ event: 'asc' }, { channel: 'asc' }],
    });
  }

  async findByUserIdAndEvent(
    userId: number,
    event: string,
  ): Promise<NotificationPreference[]> {
    return this.prisma.notificationPreference.findMany({
      where: {
        userId,
        event,
      },
    });
  }

  async isChannelEnabledForUser(
    userId: number,
    event: string,
    channel: NotificationChannel,
  ): Promise<boolean> {
    const preference = await this.prisma.notificationPreference.findUnique({
      where: {
        userId_event_channel: {
          userId,
          event,
          channel,
        },
      },
    });

    // If no preference exists, default to enabled
    return preference ? preference.enabled : true;
  }

  async enableAll(userId: number): Promise<number> {
    const result = await this.prisma.notificationPreference.updateMany({
      where: { userId },
      data: { enabled: true },
    });
    return result.count;
  }

  async disableAll(userId: number): Promise<number> {
    const result = await this.prisma.notificationPreference.updateMany({
      where: { userId },
      data: { enabled: false },
    });
    return result.count;
  }

  async disableChannelForUser(
    userId: number,
    channel: NotificationChannel,
  ): Promise<number> {
    const result = await this.prisma.notificationPreference.updateMany({
      where: {
        userId,
        channel,
      },
      data: { enabled: false },
    });
    return result.count;
  }

  async delete(id: number): Promise<void> {
    await this.prisma.notificationPreference.delete({
      where: { id },
    });
  }

  async deleteAllForUser(userId: number): Promise<number> {
    const result = await this.prisma.notificationPreference.deleteMany({
      where: { userId },
    });
    return result.count;
  }
}

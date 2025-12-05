import { Injectable } from '@nestjs/common';
import { NotificationConfig, NotificationChannel, Prisma } from '@prisma/client';
import { PrismaService } from '../../core/config/prisma/prisma.service';

export interface CreateNotificationConfigDto {
  event: string;
  channels: NotificationChannel[];
  template: string;
  priority?: string;
  enabled?: boolean;
  retries?: number;
  conditions?: Record<string, any>;
  metadata?: Record<string, any>;
  description?: string;
}

export interface UpdateNotificationConfigDto {
  channels?: NotificationChannel[];
  template?: string;
  priority?: string;
  enabled?: boolean;
  retries?: number;
  conditions?: Record<string, any>;
  metadata?: Record<string, any>;
  description?: string;
}

@Injectable()
export class NotificationConfigRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateNotificationConfigDto): Promise<NotificationConfig> {
    return this.prisma.notificationConfig.create({
      data: {
        event: createDto.event,
        channels: createDto.channels,
        template: createDto.template,
        priority: createDto.priority ?? 'NORMAL',
        enabled: createDto.enabled ?? true,
        retries: createDto.retries ?? 3,
        conditions: createDto.conditions ?? Prisma.JsonNull,
        metadata: createDto.metadata ?? Prisma.JsonNull,
        description: createDto.description,
      },
    });
  }

  async findByEvent(event: string): Promise<NotificationConfig | null> {
    return this.prisma.notificationConfig.findUnique({
      where: { event },
    });
  }

  async findActiveByEvent(event: string): Promise<NotificationConfig | null> {
    return this.prisma.notificationConfig.findFirst({
      where: {
        event,
        enabled: true,
      },
    });
  }

  async findAll(): Promise<NotificationConfig[]> {
    return this.prisma.notificationConfig.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllActive(): Promise<NotificationConfig[]> {
    return this.prisma.notificationConfig.findMany({
      where: { enabled: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(
    event: string,
    updateDto: UpdateNotificationConfigDto,
  ): Promise<NotificationConfig> {
    return this.prisma.notificationConfig.update({
      where: { event },
      data: {
        ...(updateDto.channels && { channels: updateDto.channels }),
        ...(updateDto.template && { template: updateDto.template }),
        ...(updateDto.priority && { priority: updateDto.priority }),
        ...(updateDto.enabled !== undefined && { enabled: updateDto.enabled }),
        ...(updateDto.retries !== undefined && { retries: updateDto.retries }),
        ...(updateDto.conditions !== undefined && { conditions: updateDto.conditions }),
        ...(updateDto.metadata !== undefined && { metadata: updateDto.metadata }),
        ...(updateDto.description !== undefined && { description: updateDto.description }),
        updatedAt: new Date(),
      },
    });
  }

  async delete(event: string): Promise<void> {
    await this.prisma.notificationConfig.delete({
      where: { event },
    });
  }

  async toggleEnabled(event: string, enabled: boolean): Promise<NotificationConfig> {
    return this.prisma.notificationConfig.update({
      where: { event },
      data: { enabled, updatedAt: new Date() },
    });
  }

  async upsert(createDto: CreateNotificationConfigDto): Promise<NotificationConfig> {
    return this.prisma.notificationConfig.upsert({
      where: { event: createDto.event },
      create: {
        event: createDto.event,
        channels: createDto.channels,
        template: createDto.template,
        priority: createDto.priority ?? 'NORMAL',
        enabled: createDto.enabled ?? true,
        retries: createDto.retries ?? 3,
        conditions: createDto.conditions ?? Prisma.JsonNull,
        metadata: createDto.metadata ?? Prisma.JsonNull,
        description: createDto.description,
      },
      update: {
        channels: createDto.channels,
        template: createDto.template,
        priority: createDto.priority ?? 'NORMAL',
        enabled: createDto.enabled ?? true,
        retries: createDto.retries ?? 3,
        conditions: createDto.conditions,
        metadata: createDto.metadata,
        description: createDto.description,
        updatedAt: new Date(),
      },
    });
  }
}

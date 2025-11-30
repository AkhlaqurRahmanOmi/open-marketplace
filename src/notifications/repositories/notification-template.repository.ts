import { Injectable } from '@nestjs/common';
import { NotificationTemplate, NotificationChannel } from '@prisma/client';
import { PrismaService } from '../../core/config/prisma/prisma.service';
import { CreateTemplateDto, UpdateTemplateDto } from '../dtos';

@Injectable()
export class NotificationTemplateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateTemplateDto): Promise<NotificationTemplate> {
    return this.prisma.notificationTemplate.create({
      data: {
        name: createDto.name,
        event: createDto.event,
        channel: createDto.channel as NotificationChannel,
        subject: createDto.subject,
        template: createDto.template,
        isActive: createDto.isActive ?? true,
      },
    });
  }

  async findById(id: number): Promise<NotificationTemplate | null> {
    return this.prisma.notificationTemplate.findUnique({
      where: { id },
    });
  }

  async findByName(name: string): Promise<NotificationTemplate | null> {
    return this.prisma.notificationTemplate.findUnique({
      where: { name },
    });
  }

  async findByEventAndChannel(
    event: string,
    channel: NotificationChannel,
  ): Promise<NotificationTemplate | null> {
    return this.prisma.notificationTemplate.findFirst({
      where: {
        event,
        channel,
        isActive: true,
      },
    });
  }

  async findAll(): Promise<NotificationTemplate[]> {
    return this.prisma.notificationTemplate.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findActiveByEvent(event: string): Promise<NotificationTemplate[]> {
    return this.prisma.notificationTemplate.findMany({
      where: {
        event,
        isActive: true,
      },
    });
  }

  async update(
    id: number,
    updateDto: UpdateTemplateDto,
  ): Promise<NotificationTemplate> {
    return this.prisma.notificationTemplate.update({
      where: { id },
      data: {
        ...(updateDto.name && { name: updateDto.name }),
        ...(updateDto.event && { event: updateDto.event }),
        ...(updateDto.channel && { channel: updateDto.channel as NotificationChannel }),
        ...(updateDto.subject !== undefined && { subject: updateDto.subject }),
        ...(updateDto.template && { template: updateDto.template }),
        ...(updateDto.isActive !== undefined && { isActive: updateDto.isActive }),
        updatedAt: new Date(),
      },
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.notificationTemplate.delete({
      where: { id },
    });
  }

  async toggleActive(id: number, isActive: boolean): Promise<NotificationTemplate> {
    return this.prisma.notificationTemplate.update({
      where: { id },
      data: { isActive },
    });
  }
}

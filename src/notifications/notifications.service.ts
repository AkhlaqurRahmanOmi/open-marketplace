import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Notification, NotificationTemplate, NotificationPreference } from '@prisma/client';
import {
  NotificationRepository,
  NotificationTemplateRepository,
  NotificationPreferenceRepository,
} from './repositories';
import {
  SendNotificationDto,
  CreateTemplateDto,
  UpdateTemplateDto,
  NotificationFilterDto,
  UpdatePreferenceDto,
  MarkAsReadDto,
} from './dtos';
import { PaginatedResult } from '../shared/types';
import { NotificationChannel } from './enums';
import { QUEUE_NAMES } from './queue.config';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notificationRepo: NotificationRepository,
    private readonly templateRepo: NotificationTemplateRepository,
    private readonly preferenceRepo: NotificationPreferenceRepository,

    // Inject BullMQ queues
    @InjectQueue(QUEUE_NAMES.EMAIL) private emailQueue: Queue,
    @InjectQueue(QUEUE_NAMES.REALTIME) private realtimeQueue: Queue,
  ) {}

  // ========================
  // Notification Dispatching
  // ========================

  /**
   * Send notification via queue (async, non-blocking)
   */
  async send(dto: SendNotificationDto): Promise<Array<{ channel: string; success: boolean; error?: string }>> {
    const results: Array<{ channel: string; success: boolean; error?: string }> = [];

    // Enqueue jobs for each channel
    for (const channel of dto.channels) {
      if (channel === NotificationChannel.EMAIL) {
        await this.emailQueue.add('send-email', {
          userId: dto.userId,
          userIds: dto.userIds,
          event: dto.event,
          title: dto.title,
          message: dto.message,
          templateName: dto.templateName,
          data: dto.data,
        });

        results.push({ channel: NotificationChannel.EMAIL, success: true });
      }

      if (channel === NotificationChannel.REALTIME) {
        await this.realtimeQueue.add('send-realtime', {
          userId: dto.userId,
          userIds: dto.userIds,
          event: dto.event,
          title: dto.title,
          message: dto.message,
          templateName: dto.templateName,
          data: dto.data,
        });

        results.push({ channel: NotificationChannel.REALTIME, success: true });
      }

      // SMS and PUSH not implemented yet
      if (channel === NotificationChannel.SMS) {
        results.push({
          channel: NotificationChannel.SMS,
          success: false,
          error: 'SMS channel not implemented',
        });
      }

      if (channel === NotificationChannel.PUSH) {
        results.push({
          channel: NotificationChannel.PUSH,
          success: false,
          error: 'Push channel not implemented',
        });
      }
    }

    return results;
  }

  // ========================
  // Notification Management
  // ========================

  async getNotifications(filterDto: NotificationFilterDto): Promise<PaginatedResult<Notification>> {
    return this.notificationRepo.findWithFilters(filterDto);
  }

  async getNotificationById(id: number): Promise<Notification> {
    const notification = await this.notificationRepo.findById(id);
    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }
    return notification;
  }

  async getUserNotifications(userId: number): Promise<Notification[]> {
    return this.notificationRepo.findByUserId(userId);
  }

  async getUnreadNotifications(userId: number): Promise<Notification[]> {
    return this.notificationRepo.findUnreadByUserId(userId);
  }

  async getUnreadCount(userId: number): Promise<number> {
    return this.notificationRepo.countUnreadByUserId(userId);
  }

  async markAsRead(dto: MarkAsReadDto): Promise<{ updated: number }> {
    const count = await this.notificationRepo.markMultipleAsRead(dto.notificationIds);
    return { updated: count };
  }

  async markAllAsRead(userId: number): Promise<{ updated: number }> {
    const count = await this.notificationRepo.markAllAsReadForUser(userId);
    return { updated: count };
  }

  async deleteNotification(id: number): Promise<void> {
    const notification = await this.notificationRepo.findById(id);
    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }
    await this.notificationRepo.delete(id);
  }

  async deleteMultipleNotifications(ids: number[]): Promise<{ deleted: number }> {
    const count = await this.notificationRepo.deleteMultiple(ids);
    return { deleted: count };
  }

  // ========================
  // Template Management
  // ========================

  async createTemplate(dto: CreateTemplateDto): Promise<NotificationTemplate> {
    return this.templateRepo.create(dto);
  }

  async getTemplates(): Promise<NotificationTemplate[]> {
    return this.templateRepo.findAll();
  }

  async getTemplateById(id: number): Promise<NotificationTemplate> {
    const template = await this.templateRepo.findById(id);
    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }
    return template;
  }

  async getTemplateByName(name: string): Promise<NotificationTemplate> {
    const template = await this.templateRepo.findByName(name);
    if (!template) {
      throw new NotFoundException(`Template with name ${name} not found`);
    }
    return template;
  }

  async updateTemplate(id: number, dto: UpdateTemplateDto): Promise<NotificationTemplate> {
    const template = await this.templateRepo.findById(id);
    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }
    return this.templateRepo.update(id, dto);
  }

  async deleteTemplate(id: number): Promise<void> {
    const template = await this.templateRepo.findById(id);
    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }
    await this.templateRepo.delete(id);
  }

  async toggleTemplate(id: number, isActive: boolean): Promise<NotificationTemplate> {
    const template = await this.templateRepo.findById(id);
    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }
    return this.templateRepo.toggleActive(id, isActive);
  }

  // ========================
  // Preference Management
  // ========================

  async updatePreference(dto: UpdatePreferenceDto): Promise<NotificationPreference> {
    return this.preferenceRepo.upsert(dto);
  }

  async getUserPreferences(userId: number): Promise<NotificationPreference[]> {
    return this.preferenceRepo.findByUserId(userId);
  }

  async enableAllNotifications(userId: number): Promise<{ updated: number }> {
    const count = await this.preferenceRepo.enableAll(userId);
    return { updated: count };
  }

  async disableAllNotifications(userId: number): Promise<{ updated: number }> {
    const count = await this.preferenceRepo.disableAll(userId);
    return { updated: count };
  }

  async deleteUserNotifications(userId: number): Promise<{ deleted: number }> {
    const count = await this.notificationRepo.deleteByUserId(userId);
    return { deleted: count };
  }

  
}

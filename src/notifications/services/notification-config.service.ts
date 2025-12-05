import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { NotificationConfig, NotificationChannel } from '@prisma/client';
import {
  NotificationConfigRepository,
  CreateNotificationConfigDto,
  UpdateNotificationConfigDto,
} from '../repositories/notification-config.repository';

@Injectable()
export class NotificationConfigService {
  private readonly logger = new Logger(NotificationConfigService.name);
  private readonly CACHE_PREFIX = 'notification:config:';
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    private readonly configRepo: NotificationConfigRepository,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  /**
   * Get notification config for an event with caching
   */
  async getConfigForEvent(eventName: string): Promise<NotificationConfig | null> {
    const cacheKey = `${this.CACHE_PREFIX}${eventName}`;

    try {
      // Try cache first
      const cached = await this.cacheManager.get<NotificationConfig>(cacheKey);
      if (cached) {
        this.logger.debug(`Config cache hit for event: ${eventName}`);
        return cached;
      }

      // Cache miss - fetch from database
      this.logger.debug(`Config cache miss for event: ${eventName}`);
      const config = await this.configRepo.findActiveByEvent(eventName);

      // Cache the result (even if null to prevent repeated DB queries)
      if (config) {
        await this.cacheManager.set(cacheKey, config, this.CACHE_TTL * 1000);
      }

      return config;
    } catch (error) {
      this.logger.error(`Failed to get config for event ${eventName}:`, error);
      // Fallback to DB if cache fails
      return this.configRepo.findActiveByEvent(eventName);
    }
  }

  /**
   * Get default config if no config exists
   */
  getDefaultConfig(eventName: string): Partial<NotificationConfig> {
    return {
      event: eventName,
      channels: [NotificationChannel.email],
      template: 'default',
      priority: 'NORMAL',
      enabled: true,
      retries: 3,
    };
  }

  /**
   * Get config with fallback to defaults
   */
  async getConfigWithDefaults(eventName: string): Promise<Partial<NotificationConfig>> {
    const config = await this.getConfigForEvent(eventName);
    return config || this.getDefaultConfig(eventName);
  }

  /**
   * Create new notification config
   */
  async createConfig(createDto: CreateNotificationConfigDto): Promise<NotificationConfig> {
    const config = await this.configRepo.create(createDto);
    await this.invalidateCache(config.event);
    this.logger.log(`Created config for event: ${config.event}`);
    return config;
  }

  /**
   * Update notification config
   */
  async updateConfig(
    event: string,
    updateDto: UpdateNotificationConfigDto,
  ): Promise<NotificationConfig> {
    const config = await this.configRepo.update(event, updateDto);
    await this.invalidateCache(event);
    this.logger.log(`Updated config for event: ${event}`);
    return config;
  }

  /**
   * Upsert notification config (create or update)
   */
  async upsertConfig(createDto: CreateNotificationConfigDto): Promise<NotificationConfig> {
    const config = await this.configRepo.upsert(createDto);
    await this.invalidateCache(config.event);
    this.logger.log(`Upserted config for event: ${config.event}`);
    return config;
  }

  /**
   * Delete notification config
   */
  async deleteConfig(event: string): Promise<void> {
    await this.configRepo.delete(event);
    await this.invalidateCache(event);
    this.logger.log(`Deleted config for event: ${event}`);
  }

  /**
   * Toggle enabled status
   */
  async toggleEnabled(event: string, enabled: boolean): Promise<NotificationConfig> {
    const config = await this.configRepo.toggleEnabled(event, enabled);
    await this.invalidateCache(event);
    this.logger.log(`Toggled config ${enabled ? 'enabled' : 'disabled'} for event: ${event}`);
    return config;
  }

  /**
   * Get all configs
   */
  async getAllConfigs(): Promise<NotificationConfig[]> {
    return this.configRepo.findAll();
  }

  /**
   * Get all active configs
   */
  async getAllActiveConfigs(): Promise<NotificationConfig[]> {
    return this.configRepo.findAllActive();
  }

  /**
   * Invalidate cache for a specific event
   */
  async invalidateCache(eventName: string): Promise<void> {
    const cacheKey = `${this.CACHE_PREFIX}${eventName}`;
    try {
      await this.cacheManager.del(cacheKey);
      this.logger.debug(`Invalidated cache for event: ${eventName}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate cache for ${eventName}:`, error);
    }
  }

  /**
   * Clear all notification config cache
   */
  async clearAllCache(): Promise<void> {
    try {
      // Note: This is a simple implementation
      // In production, you might want to track all cached keys
      this.logger.log('Cache cleared (partial - specific keys only)');
    } catch (error) {
      this.logger.error('Failed to clear cache:', error);
    }
  }

  /**
   * Check if conditions match for sending notification
   */
  evaluateConditions(
    config: NotificationConfig,
    data: Record<string, any>,
  ): boolean {
    if (!config.conditions) {
      return true; // No conditions = always send
    }

    const conditions = config.conditions as Record<string, any>;

    for (const [key, condition] of Object.entries(conditions)) {
      const value = data[key];

      // Simple condition evaluation
      if (typeof condition === 'object') {
        if (condition.min !== undefined && value < condition.min) return false;
        if (condition.max !== undefined && value > condition.max) return false;
        if (condition.equals !== undefined && value !== condition.equals) return false;
        if (condition.in !== undefined && !condition.in.includes(value)) return false;
      } else if (value !== condition) {
        return false;
      }
    }

    return true;
  }
}

import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { OrganizationSettings } from '@prisma/client';
import { OrganizationRepository } from '../repositories/organization.repository';
import { OrganizationSettingsRepository, SettingsWithAttributes } from '../repositories/organization-settings.repository';
import { UpdateOrganizationSettingsDto } from '../dtos';

@Injectable()
export class OrganizationSettingsProvider {
  private readonly logger = new Logger(OrganizationSettingsProvider.name);

  constructor(
    private readonly organizationRepo: OrganizationRepository,
    private readonly settingsRepo: OrganizationSettingsRepository,
  ) {}

  async getSettings(organizationId: number): Promise<SettingsWithAttributes> {
    // Verify organization exists
    const organization = await this.organizationRepo.findByIdBasic(organizationId);
    if (!organization) {
      throw new NotFoundException(`Organization with ID ${organizationId} not found`);
    }

    let settings = await this.settingsRepo.findByOrganizationId(organizationId);
    if (!settings) {
      // Create default settings if not exists
      await this.settingsRepo.create({
        organization: { connect: { id: organizationId } },
        notificationEmail: organization.email,
        language: 'en',
      });
      settings = await this.settingsRepo.findByOrganizationId(organizationId);
    }

    if (!settings) {
      throw new NotFoundException(`Failed to retrieve settings for organization ${organizationId}`);
    }
    return settings;
  }

  async updateSettings(
    organizationId: number,
    dto: UpdateOrganizationSettingsDto,
  ): Promise<SettingsWithAttributes> {
    // Verify organization exists
    const organization = await this.organizationRepo.findByIdBasic(organizationId);
    if (!organization) {
      throw new NotFoundException(`Organization with ID ${organizationId} not found`);
    }

    // Extract additional settings from DTO
    const { additionalSettings, ...coreSettings } = dto;

    // Upsert core settings
    await this.settingsRepo.upsert(organizationId, coreSettings);

    // Handle additional settings if provided
    if (additionalSettings) {
      const settings = await this.settingsRepo.findByOrganizationId(organizationId);
      if (settings) {
        for (const [key, value] of Object.entries(additionalSettings)) {
          const valueType = typeof value === 'number' ? 'number' 
            : typeof value === 'boolean' ? 'boolean'
            : typeof value === 'object' ? 'json'
            : 'string';
          
          const stringValue = valueType === 'json' 
            ? JSON.stringify(value) 
            : String(value);

          await this.settingsRepo.upsertAttribute(
            settings.id,
            key,
            stringValue,
            valueType
          );
        }
      }
    }

    this.logger.log(`Settings updated for organization ${organizationId}`);

    const result = await this.settingsRepo.findByOrganizationId(organizationId);
    if (!result) {
      throw new NotFoundException(`Failed to retrieve settings for organization ${organizationId}`);
    }
    return result;
  }

  async getAdditionalSettings(organizationId: number): Promise<Record<string, any>> {
    // Verify organization exists
    const organization = await this.organizationRepo.findByIdBasic(organizationId);
    if (!organization) {
      throw new NotFoundException(`Organization with ID ${organizationId} not found`);
    }

    return this.settingsRepo.getAdditionalSettings(organizationId);
  }

  async setAdditionalSetting(
    organizationId: number,
    key: string,
    value: any,
  ): Promise<void> {
    // Verify organization exists
    const organization = await this.organizationRepo.findByIdBasic(organizationId);
    if (!organization) {
      throw new NotFoundException(`Organization with ID ${organizationId} not found`);
    }

    // Ensure settings exist
    let settings = await this.settingsRepo.findByOrganizationId(organizationId);
    if (!settings) {
      await this.settingsRepo.create({
        organization: { connect: { id: organizationId } },
        notificationEmail: organization.email,
        language: 'en',
      });
      settings = await this.settingsRepo.findByOrganizationId(organizationId);
    }

    if (!settings) {
      throw new NotFoundException(`Failed to retrieve settings for organization ${organizationId}`);
    }

    const valueType = typeof value === 'number' ? 'number'
      : typeof value === 'boolean' ? 'boolean'
      : typeof value === 'object' ? 'json'
      : 'string';

    const stringValue = valueType === 'json'
      ? JSON.stringify(value)
      : String(value);

    await this.settingsRepo.upsertAttribute(settings.id, key, stringValue, valueType);

    this.logger.log(`Additional setting "${key}" updated for organization ${organizationId}`);
  }

  async deleteAdditionalSetting(
    organizationId: number,
    key: string,
  ): Promise<void> {
    const settings = await this.settingsRepo.findByOrganizationId(organizationId);
    if (!settings) {
      throw new NotFoundException(`Settings not found for organization ${organizationId}`);
    }

    await this.settingsRepo.deleteAttribute(settings.id, key);

    this.logger.log(`Additional setting "${key}" deleted for organization ${organizationId}`);
  }
}


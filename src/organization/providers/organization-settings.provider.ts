import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { OrganizationSettings } from '@prisma/client';
import { OrganizationRepository } from '../repositories';
import { OrganizationSettingsRepository, SettingsWithAttributes } from '../repositories';
import { UpdateOrganizationSettingsDto } from '../dtos';

@Injectable()
export class OrganizationSettingsProvider {
  private readonly logger = new Logger(OrganizationSettingsProvider.name);

  constructor(
    private readonly organizationRepo: OrganizationRepository,
    private readonly settingsRepo: OrganizationSettingsRepository,
  ) {}

  async getSettings(organizationId: number): Promise<SettingsWithAttributes> {
    const organization = await this.verifyOrganizationExists(organizationId);
    const settings = await this.ensureSettingsExist(organizationId, organization.email);
    return settings;
  }

  async updateSettings(
    organizationId: number,
    dto: UpdateOrganizationSettingsDto,
  ): Promise<SettingsWithAttributes> {
    const organization = await this.verifyOrganizationExists(organizationId);
    const { additionalSettings, ...coreSettings } = dto;

    await this.settingsRepo.upsert(organizationId, coreSettings);

    if (additionalSettings) {
      const settings = await this.ensureSettingsExist(organizationId, organization.email);
      await this.upsertAdditionalSettings(settings.id, additionalSettings);
    }

    this.logger.log(`Settings updated for organization ${organizationId}`);
    return this.getSettingsOrThrow(organizationId);
  }

  async getAdditionalSettings(organizationId: number): Promise<Record<string, any>> {
    await this.verifyOrganizationExists(organizationId);
    return this.settingsRepo.getAdditionalSettings(organizationId);
  }

  async setAdditionalSetting(
    organizationId: number,
    key: string,
    value: any,
  ): Promise<void> {
    const organization = await this.verifyOrganizationExists(organizationId);
    const settings = await this.ensureSettingsExist(organizationId, organization.email);
    const { stringValue, valueType } = this.convertSettingValue(value);

    await this.settingsRepo.upsertAttribute(settings.id, key, stringValue, valueType);
    this.logger.log(`Additional setting "${key}" updated for organization ${organizationId}`);
  }

  async deleteAdditionalSetting(
    organizationId: number,
    key: string,
  ): Promise<void> {
    await this.verifyOrganizationExists(organizationId);
    const settings = await this.getSettingsOrThrow(organizationId);
    await this.settingsRepo.deleteAttribute(settings.id, key);
    this.logger.log(`Additional setting "${key}" deleted for organization ${organizationId}`);
  }

  private async verifyOrganizationExists(organizationId: number) {
    const organization = await this.organizationRepo.findByIdBasic(organizationId);
    if (!organization) {
      throw new NotFoundException(`Organization with ID ${organizationId} not found`);
    }
    return organization;
  }

  private async ensureSettingsExist(
    organizationId: number,
    email: string,
  ): Promise<SettingsWithAttributes> {
    let settings = await this.settingsRepo.findByOrganizationId(organizationId);

    if (!settings) {
      await this.settingsRepo.create({
        organization: { connect: { id: organizationId } },
        notificationEmail: email,
        language: 'en',
      });
      settings = await this.settingsRepo.findByOrganizationId(organizationId);
    }

    if (!settings) {
      throw new NotFoundException(`Failed to retrieve settings for organization ${organizationId}`);
    }
    return settings;
  }

  private async getSettingsOrThrow(organizationId: number): Promise<SettingsWithAttributes> {
    const settings = await this.settingsRepo.findByOrganizationId(organizationId);
    if (!settings) {
      throw new NotFoundException(`Settings not found for organization ${organizationId}`);
    }
    return settings;
  }

  private convertSettingValue(value: any): { stringValue: string; valueType: string } {
    const valueType = typeof value === 'number' ? 'number'
      : typeof value === 'boolean' ? 'boolean'
        : typeof value === 'object' ? 'json'
          : 'string';

    const stringValue = valueType === 'json'
      ? JSON.stringify(value)
      : String(value);

    return { stringValue, valueType };
  }

  private async upsertAdditionalSettings(
    settingsId: number,
    additionalSettings: Record<string, any>,
  ): Promise<void> {
    for (const [key, value] of Object.entries(additionalSettings)) {
      const { stringValue, valueType } = this.convertSettingValue(value);
      await this.settingsRepo.upsertAttribute(settingsId, key, stringValue, valueType);
    }
  }
}

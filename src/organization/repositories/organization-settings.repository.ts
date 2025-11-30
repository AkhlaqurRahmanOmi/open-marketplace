import { Injectable } from '@nestjs/common';
import { OrganizationSettings, Prisma } from '@prisma/client';
import { PrismaService } from 'src/core/config/prisma/prisma.service';

// Type for settings with additional attributes
export type SettingsWithAttributes = OrganizationSettings & {
  additionalSettings?: {
    id: number;
    key: string;
    value: string;
    valueType: string;
  }[];
};

@Injectable()
export class OrganizationSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly includeAttributes = {
    additionalSettings: {
      select: {
        id: true,
        key: true,
        value: true,
        valueType: true,
      },
    },
  };

  async findByOrganizationId(organizationId: number): Promise<SettingsWithAttributes | null> {
    return this.prisma.organizationSettings.findUnique({
      where: { organizationId },
      include: this.includeAttributes,
    });
  }

  async create(data: Prisma.OrganizationSettingsCreateInput): Promise<OrganizationSettings> {
    return this.prisma.organizationSettings.create({
      data,
    });
  }

  async update(
    organizationId: number,
    data: Prisma.OrganizationSettingsUpdateInput
  ): Promise<OrganizationSettings> {
    return this.prisma.organizationSettings.update({
      where: { organizationId },
      data,
    });
  }

  async upsert(
    organizationId: number,
    data: Omit<Prisma.OrganizationSettingsCreateInput, 'organization'>
  ): Promise<OrganizationSettings> {
    return this.prisma.organizationSettings.upsert({
      where: { organizationId },
      create: {
        ...data,
        organization: { connect: { id: organizationId } },
      },
      update: data,
    });
  }

  async delete(organizationId: number): Promise<void> {
    await this.prisma.organizationSettings.delete({
      where: { organizationId },
    });
  }

  // Update or create additional setting attribute
  async upsertAttribute(
    organizationSettingsId: number,
    key: string,
    value: string,
    valueType: string = 'string'
  ): Promise<void> {
    await this.prisma.organizationSettingAttribute.upsert({
      where: {
        organizationSettingsId_key: { organizationSettingsId, key },
      },
      create: {
        organizationSettingsId,
        key,
        value,
        valueType,
      },
      update: {
        value,
        valueType,
      },
    });
  }

  // Delete additional setting attribute
  async deleteAttribute(organizationSettingsId: number, key: string): Promise<void> {
    await this.prisma.organizationSettingAttribute.delete({
      where: {
        organizationSettingsId_key: { organizationSettingsId, key },
      },
    });
  }

  // Get all additional settings as key-value object
  async getAdditionalSettings(organizationId: number): Promise<Record<string, any>> {
    const settings = await this.prisma.organizationSettings.findUnique({
      where: { organizationId },
      include: {
        additionalSettings: true,
      },
    });

    if (!settings) return {};

    const result: Record<string, any> = {};
    settings.additionalSettings.forEach((attr) => {
      result[attr.key] = this.parseValue(attr.value, attr.valueType);
    });

    return result;
  }

  private parseValue(value: string, valueType: string): any {
    switch (valueType) {
      case 'number':
        return parseFloat(value);
      case 'boolean':
        return value === 'true';
      case 'json':
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      default:
        return value;
    }
  }
}


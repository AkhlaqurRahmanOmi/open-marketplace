import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/config/prisma/prisma.service';

@Injectable()
export class AttributeValueRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findOrganization(organizationId: number) {
    return this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, type: true },
    });
  }

  async findByOrganizationId(organizationId: number) {
    return this.prisma.organizationAttribute.findMany({
      where: { organizationId },
      include: { arrayItems: true },
    });
  }

  async upsert(
    organizationId: number,
    key: string,
    data: Omit<Prisma.OrganizationAttributeCreateInput, 'organization' | 'key'>,
  ) {
    return this.prisma.organizationAttribute.upsert({
      where: {
        organizationId_key: {
          organizationId,
          key,
        },
      },
      update: data,
      create: {
        organization: { connect: { id: organizationId } },
        key,
        ...data,
      },
    });
  }

  async deleteArrayItems(attributeId: number) {
    return this.prisma.attributeArrayItem.deleteMany({
      where: { attributeId },
    });
  }

  async createArrayItems(
    data: Prisma.AttributeArrayItemCreateManyInput[],
  ) {
    return this.prisma.attributeArrayItem.createMany({
      data,
    });
  }
}

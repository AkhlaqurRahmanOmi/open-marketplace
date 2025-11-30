import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/config/prisma/prisma.service';

@Injectable()
export class AttributeDefinitionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.AttributeDefinitionCreateInput) {
    return this.prisma.attributeDefinition.create({
      data,
      include: {
        applicableOrganizationTypes: true,
        options: true,
      },
    });
  }

  async findByOrganizationType(organizationType: string) {
    return this.prisma.attributeDefinition.findMany({
      where: {
        isActive: true,
        applicableOrganizationTypes: {
          some: { organizationType },
        },
      },
      include: {
        options: {
          where: { isActive: true },
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async findByKey(key: string) {
    return this.prisma.attributeDefinition.findUnique({
      where: { key },
      include: {
        options: true,
      },
    });
  }
}

import { Injectable } from '@nestjs/common';
import { InventoryMovement } from '@prisma/client';
import { PrismaService } from '../../core/config/prisma/prisma.service';
import { BaseRepository } from '../../shared/repository/base.repository';
import { PaginatedResult, QueryOptions } from '../../shared/types';

@Injectable()
export class InventoryMovementRepository extends BaseRepository<InventoryMovement, number> {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findById(id: number): Promise<InventoryMovement | null> {
    return this.prisma.inventoryMovement.findUnique({
      where: { id },
      include: {
        variant: {
          include: {
            product: true,
          },
        },
        location: true,
        order: true,
      },
    });
  }

  async findAll(): Promise<InventoryMovement[]> {
    return this.prisma.inventoryMovement.findMany({
      include: {
        variant: {
          include: {
            product: true,
          },
        },
        location: true,
        order: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: Partial<InventoryMovement>): Promise<InventoryMovement> {
    return this.prisma.inventoryMovement.create({
      data: data as any,
      include: {
        variant: true,
        location: true,
        order: true,
      },
    });
  }

  async update(id: number, data: Partial<InventoryMovement>): Promise<InventoryMovement> {
    return this.prisma.inventoryMovement.update({
      where: { id },
      data,
      include: {
        variant: true,
        location: true,
        order: true,
      },
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.inventoryMovement.delete({
      where: { id },
    });
  }

  async findByVariantId(variantId: number): Promise<InventoryMovement[]> {
    return this.prisma.inventoryMovement.findMany({
      where: { variantId },
      include: {
        variant: true,
        location: true,
        order: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByLocationId(locationId: number): Promise<InventoryMovement[]> {
    return this.prisma.inventoryMovement.findMany({
      where: { locationId },
      include: {
        variant: {
          include: {
            product: true,
          },
        },
        location: true,
        order: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByOrderId(orderId: number): Promise<InventoryMovement[]> {
    return this.prisma.inventoryMovement.findMany({
      where: { orderId },
      include: {
        variant: {
          include: {
            product: true,
          },
        },
        location: true,
        order: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findWithFilters(options: QueryOptions): Promise<PaginatedResult<InventoryMovement>> {
    const {
      filters = {},
      sort,
      pagination = { page: 1, limit: 10 },
    } = options;

    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const where: any = {
      ...filters,
    };

    const [data, total] = await Promise.all([
      this.prisma.inventoryMovement.findMany({
        where,
        skip,
        take: limit,
        orderBy: sort ? { [sort.field]: sort.order } : { createdAt: 'desc' },
        include: {
          variant: {
            include: {
              product: true,
            },
          },
          location: true,
          order: true,
        },
      }),
      this.prisma.inventoryMovement.count({ where }),
    ]);

    return {
      data,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  async countTotal(): Promise<number> {
    return this.prisma.inventoryMovement.count();
  }

  async search(query: string, fields: string[]): Promise<InventoryMovement[]> {
    const where: any = {
      OR: fields.map((field) => ({
        [field]: {
          contains: query,
          mode: 'insensitive',
        },
      })),
    };

    return this.prisma.inventoryMovement.findMany({
      where,
      include: {
        variant: {
          include: {
            product: true,
          },
        },
        location: true,
        order: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

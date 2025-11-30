import { Injectable } from '@nestjs/common';
import { VariantInventory } from '@prisma/client';
import { PrismaService } from '../../core/config/prisma/prisma.service';
import { BaseRepository } from '../../shared/repository/base.repository';

@Injectable()
export class VariantInventoryRepository extends BaseRepository<VariantInventory, number> {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findById(id: number): Promise<VariantInventory | null> {
    return this.prisma.variantInventory.findUnique({
      where: { id },
      include: {
        variant: {
          include: {
            product: true,
          },
        },
        location: true,
      },
    });
  }

  async findAll(): Promise<VariantInventory[]> {
    return this.prisma.variantInventory.findMany({
      include: {
        variant: {
          include: {
            product: true,
          },
        },
        location: true,
      },
    });
  }

  async create(data: Partial<VariantInventory>): Promise<VariantInventory> {
    return this.prisma.variantInventory.create({
      data: data as any,
      include: {
        variant: true,
        location: true,
      },
    });
  }

  async update(id: number, data: Partial<VariantInventory>): Promise<VariantInventory> {
    return this.prisma.variantInventory.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
      include: {
        variant: true,
        location: true,
      },
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.variantInventory.delete({
      where: { id },
    });
  }

  async findByVariantAndLocation(
    variantId: number,
    locationId: number,
  ): Promise<VariantInventory | null> {
    return this.prisma.variantInventory.findUnique({
      where: {
        variantId_locationId: {
          variantId,
          locationId,
        },
      },
      include: {
        variant: true,
        location: true,
      },
    });
  }

  async findByVariantId(variantId: number): Promise<VariantInventory[]> {
    return this.prisma.variantInventory.findMany({
      where: { variantId },
      include: {
        variant: true,
        location: true,
      },
    });
  }

  async findByLocationId(locationId: number): Promise<VariantInventory[]> {
    return this.prisma.variantInventory.findMany({
      where: { locationId },
      include: {
        variant: {
          include: {
            product: true,
          },
        },
        location: true,
      },
    });
  }

  async getTotalAvailableQuantity(variantId: number): Promise<number> {
    const inventories = await this.prisma.variantInventory.findMany({
      where: { variantId },
    });

    return inventories.reduce((total, inv) => total + (inv.quantity - inv.reserved), 0);
  }

  async getTotalQuantity(variantId: number): Promise<number> {
    const inventories = await this.prisma.variantInventory.findMany({
      where: { variantId },
    });

    return inventories.reduce((total, inv) => total + inv.quantity, 0);
  }

  async updateQuantity(
    variantId: number,
    locationId: number,
    delta: number,
  ): Promise<VariantInventory> {
    const inventory = await this.findByVariantAndLocation(variantId, locationId);

    if (!inventory) {
      // Create new inventory record if it doesn't exist
      return this.create({
        variantId,
        locationId,
        quantity: Math.max(0, delta),
        reserved: 0,
      });
    }

    const newQuantity = Math.max(0, inventory.quantity + delta);

    return this.update(inventory.id, { quantity: newQuantity });
  }

  async updateReserved(
    variantId: number,
    locationId: number,
    delta: number,
  ): Promise<VariantInventory> {
    const inventory = await this.findByVariantAndLocation(variantId, locationId);

    if (!inventory) {
      throw new Error('Inventory record not found');
    }

    const newReserved = Math.max(0, inventory.reserved + delta);

    // Ensure reserved doesn't exceed quantity
    if (newReserved > inventory.quantity) {
      throw new Error('Cannot reserve more than available quantity');
    }

    return this.update(inventory.id, { reserved: newReserved });
  }

  async countTotal(): Promise<number> {
    return this.prisma.variantInventory.count();
  }

  async findWithFilters(options: any): Promise<any> {
    const {
      filters = {},
      sort,
      pagination = { page: 1, limit: 10 },
    } = options;

    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.variantInventory.findMany({
        where: filters,
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
        },
      }),
      this.prisma.variantInventory.count({ where: filters }),
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

  async search(query: string, fields: string[]): Promise<VariantInventory[]> {
    // For inventory, search doesn't make much sense as it's numeric data
    // Return empty array
    return [];
  }
}

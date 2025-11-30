import { Injectable } from '@nestjs/common';
import { Variant } from '@prisma/client';
import { PrismaService } from '../../core/config/prisma/prisma.service';
import { BaseRepository } from '../../shared/repository/base.repository';
import {
  FilterOptions,
  PaginatedResult,
  QueryOptions,
} from '../../shared/types';

@Injectable()
export class VariantRepository extends BaseRepository<Variant, number> {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findById(id: number): Promise<Variant | null> {
    return this.prisma.variant.findUnique({
      where: { id },
      include: {
        product: {
          include: {
            productImages: true,
          },
        },
        variantImages: true,
        variantOptionValues: {
          include: {
            productOption: true,
            optionValue: true,
          },
        },
        variantInventories: {
          include: {
            location: true,
          },
        },
      },
    });
  }

  async findAll(): Promise<Variant[]> {
    return this.prisma.variant.findMany({
      include: {
        product: true,
        variantImages: {
          take: 1,
        },
      },
    });
  }

  async create(data: Partial<Variant>): Promise<Variant> {
    return this.prisma.variant.create({
      data: data as any,
      include: {
        product: true,
        variantImages: true,
      },
    });
  }

  async update(id: number, data: Partial<Variant>): Promise<Variant> {
    return this.prisma.variant.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
      include: {
        product: true,
        variantImages: true,
        variantOptionValues: {
          include: {
            productOption: true,
            optionValue: true,
          },
        },
      },
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.variant.delete({
      where: { id },
    });
  }

  async findWithFilters(
    options: QueryOptions,
  ): Promise<PaginatedResult<Variant>> {
    const {
      filters = {},
      sort,
      pagination = { page: 1, limit: 10 },
      search,
    } = options;

    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      ...filters,
    };

    // Add search functionality (SKU, barcode)
    if (search?.query) {
      where.OR = search.fields.map((field) => ({
        [field]: {
          contains: search.query,
          mode: 'insensitive',
        },
      }));
    }

    // Execute query with pagination
    const [data, total] = await Promise.all([
      this.prisma.variant.findMany({
        where,
        skip,
        take: limit,
        orderBy: sort ? { [sort.field]: sort.order } : { createdAt: 'desc' },
        include: {
          product: true,
          variantImages: {
            take: 1,
          },
        },
      }),
      this.prisma.variant.count({ where }),
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

  async search(query: string, fields: string[]): Promise<Variant[]> {
    const where: any = {
      OR: fields.map((field) => ({
        [field]: {
          contains: query,
          mode: 'insensitive',
        },
      })),
    };

    return this.prisma.variant.findMany({
      where,
      include: {
        product: true,
        variantImages: {
          take: 1,
        },
      },
    });
  }

  async countTotal(filters?: FilterOptions): Promise<number> {
    return this.prisma.variant.count({
      where: filters,
    });
  }

  // Variant-specific methods
  async findByProductId(productId: number): Promise<Variant[]> {
    return this.prisma.variant.findMany({
      where: { productId },
      include: {
        variantImages: true,
        variantOptionValues: {
          include: {
            productOption: true,
            optionValue: true,
          },
        },
        variantInventories: {
          include: {
            location: true,
          },
        },
      },
    });
  }

  async findBySku(sku: string): Promise<Variant | null> {
    return this.prisma.variant.findUnique({
      where: { sku },
      include: {
        product: true,
        variantImages: true,
        variantOptionValues: {
          include: {
            productOption: true,
            optionValue: true,
          },
        },
        variantInventories: {
          include: {
            location: true,
          },
        },
      },
    });
  }

  async findActiveVariants(productId?: number): Promise<Variant[]> {
    const where: any = {
      isActive: true,
    };

    if (productId) {
      where.productId = productId;
    }

    return this.prisma.variant.findMany({
      where,
      include: {
        product: true,
        variantImages: {
          take: 1,
        },
      },
    });
  }

  async linkOptionValue(
    variantId: number,
    optionId: number,
    optionValueId: number,
  ): Promise<void> {
    await this.prisma.variantOptionValue.create({
      data: {
        variantId,
        optionId,
        optionValueId,
      },
    });
  }

  async unlinkOptionValue(
    variantId: number,
    optionId: number,
    optionValueId: number,
  ): Promise<void> {
    await this.prisma.variantOptionValue.delete({
      where: {
        variantId_optionId_optionValueId: {
          variantId,
          optionId,
          optionValueId,
        },
      },
    });
  }
}

import { Injectable } from '@nestjs/common';
import { BundleItem } from '@prisma/client';
import { PrismaService } from '../../core/config/prisma/prisma.service';
import { BaseRepository } from '../../shared/repository/base.repository';
import {
  FilterOptions,
  PaginatedResult,
  QueryOptions,
} from '../../shared/types';

@Injectable()
export class BundleItemRepository extends BaseRepository<BundleItem, number> {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findById(id: number): Promise<BundleItem | null> {
    return this.prisma.bundleItem.findUnique({
      where: { id },
      include: {
        bundle: true,
        variant: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async findAll(): Promise<BundleItem[]> {
    return this.prisma.bundleItem.findMany({
      include: {
        bundle: true,
        variant: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async create(data: Partial<BundleItem>): Promise<BundleItem> {
    return this.prisma.bundleItem.create({
      data: data as any,
      include: {
        bundle: true,
        variant: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async update(id: number, data: Partial<BundleItem>): Promise<BundleItem> {
    return this.prisma.bundleItem.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
      include: {
        bundle: true,
        variant: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.bundleItem.delete({
      where: { id },
    });
  }

  async findWithFilters(
    options: QueryOptions,
  ): Promise<PaginatedResult<BundleItem>> {
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
      this.prisma.bundleItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: sort ? { [sort.field]: sort.order } : { createdAt: 'desc' },
        include: {
          bundle: true,
          variant: {
            include: {
              product: true,
            },
          },
        },
      }),
      this.prisma.bundleItem.count({ where }),
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

  async search(query: string, fields: string[]): Promise<BundleItem[]> {
    // BundleItem doesn't have searchable text fields, so return empty
    return [];
  }

  async countTotal(filters?: FilterOptions): Promise<number> {
    return this.prisma.bundleItem.count({
      where: {
        ...filters,
      },
    });
  }

  // BundleItem-specific methods
  async findByBundleId(bundleId: number): Promise<BundleItem[]> {
    return this.prisma.bundleItem.findMany({
      where: { bundleId },
      include: {
        variant: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async findByBundleAndVariant(
    bundleId: number,
    variantId: number,
  ): Promise<BundleItem | null> {
    return this.prisma.bundleItem.findUnique({
      where: {
        bundleId_variantId: {
          bundleId,
          variantId,
        },
      },
      include: {
        variant: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async deleteByBundleId(bundleId: number): Promise<void> {
    await this.prisma.bundleItem.deleteMany({
      where: { bundleId },
    });
  }
}

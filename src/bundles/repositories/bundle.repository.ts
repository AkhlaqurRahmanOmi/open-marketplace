import { Injectable } from '@nestjs/common';
import { Bundle } from '@prisma/client';
import { PrismaService } from '../../core/config/prisma/prisma.service';
import { BaseRepository } from '../../shared/repository/base.repository';
import {
  FilterOptions,
  PaginatedResult,
  QueryOptions,
} from '../../shared/types';

@Injectable()
export class BundleRepository extends BaseRepository<Bundle, number> {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findById(id: number): Promise<Bundle | null> {
    return this.prisma.bundle.findUnique({
      where: { id },
      include: {
        bundleItems: {
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });
  }

  async findAll(): Promise<Bundle[]> {
    return this.prisma.bundle.findMany({
      include: {
        bundleItems: {
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: Partial<Bundle>): Promise<Bundle> {
    return this.prisma.bundle.create({
      data: data as any,
      include: {
        bundleItems: {
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });
  }

  async update(id: number, data: Partial<Bundle>): Promise<Bundle> {
    return this.prisma.bundle.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
      include: {
        bundleItems: {
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });
  }

  async delete(id: number): Promise<void> {
    // Hard delete (bundles don't have soft delete in schema)
    await this.prisma.bundle.delete({
      where: { id },
    });
  }

  async findWithFilters(
    options: QueryOptions,
  ): Promise<PaginatedResult<Bundle>> {
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

    // Add search functionality
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
      this.prisma.bundle.findMany({
        where,
        skip,
        take: limit,
        orderBy: sort ? { [sort.field]: sort.order } : { createdAt: 'desc' },
        include: {
          bundleItems: {
            include: {
              variant: {
                include: {
                  product: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.bundle.count({ where }),
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

  async search(query: string, fields: string[]): Promise<Bundle[]> {
    const where: any = {
      OR: fields.map((field) => ({
        [field]: {
          contains: query,
          mode: 'insensitive',
        },
      })),
    };

    return this.prisma.bundle.findMany({
      where,
      include: {
        bundleItems: {
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });
  }

  async countTotal(filters?: FilterOptions): Promise<number> {
    return this.prisma.bundle.count({
      where: {
        ...filters,
      },
    });
  }

  // Bundle-specific methods
  async findActiveBundles(): Promise<Bundle[]> {
    return this.prisma.bundle.findMany({
      where: {
        isActive: true,
      },
      include: {
        bundleItems: {
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findBundlesContainingVariant(variantId: number): Promise<Bundle[]> {
    return this.prisma.bundle.findMany({
      where: {
        isActive: true,
        bundleItems: {
          some: {
            variantId: variantId,
          },
        },
      },
      include: {
        bundleItems: {
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });
  }

  async findBundlesContainingVariants(
    variantIds: number[],
  ): Promise<Bundle[]> {
    return this.prisma.bundle.findMany({
      where: {
        isActive: true,
        bundleItems: {
          some: {
            variantId: {
              in: variantIds,
            },
          },
        },
      },
      include: {
        bundleItems: {
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByIdWithItems(id: number): Promise<Bundle | null> {
    return this.prisma.bundle.findUnique({
      where: { id },
      include: {
        bundleItems: {
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });
  }
}

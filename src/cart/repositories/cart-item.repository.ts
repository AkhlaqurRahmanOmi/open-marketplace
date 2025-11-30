import { Injectable } from '@nestjs/common';
import { CartItem, Prisma } from '@prisma/client';
import { BaseRepository } from '../../shared/repository/base.repository';
import { PrismaService } from '../../core/config/prisma/prisma.service';
import {
  PaginatedResult,
  QueryOptions,
  FilterOptions,
} from '../../shared/types';

@Injectable()
export class CartItemRepository extends BaseRepository<CartItem, number> {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  /**
   * Find cart item by ID
   */
  async findById(id: number): Promise<CartItem | null> {
    return this.prisma.cartItem.findUnique({
      where: { id },
      include: {
        variant: {
          include: {
            product: true,
            variantImages: true,
          },
        },
        bundle: {
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
        },
      },
    });
  }

  /**
   * Find all cart items
   */
  async findAll(): Promise<CartItem[]> {
    return this.prisma.cartItem.findMany({
      include: {
        variant: true,
        bundle: true,
      },
    });
  }

  /**
   * Create cart item
   */
  async create(data: Partial<CartItem>): Promise<CartItem> {
    return this.prisma.cartItem.create({
      data: data as Prisma.CartItemCreateInput,
      include: {
        variant: {
          include: {
            product: true,
            variantImages: true,
          },
        },
        bundle: true,
      },
    });
  }

  /**
   * Update cart item
   */
  async update(id: number, data: Partial<CartItem>): Promise<CartItem> {
    return this.prisma.cartItem.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: {
        variant: {
          include: {
            product: true,
            variantImages: true,
          },
        },
        bundle: true,
      },
    });
  }

  /**
   * Delete cart item
   */
  async delete(id: number): Promise<void> {
    await this.prisma.cartItem.delete({
      where: { id },
    });
  }

  /**
   * Find with filters (pagination support)
   */
  async findWithFilters(
    options: QueryOptions,
  ): Promise<PaginatedResult<CartItem>> {
    const {
      pagination = { page: 1, limit: 10 },
      filters = {},
      sort = { field: 'createdAt', order: 'desc' },
    } = options;

    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const where: Prisma.CartItemWhereInput = {};

    if (filters.cartId) {
      where.cartId = filters.cartId;
    }
    if (filters.variantId) {
      where.variantId = filters.variantId;
    }
    if (filters.bundleId) {
      where.bundleId = filters.bundleId;
    }

    const total = await this.prisma.cartItem.count({ where });

    // Extract sort values for type safety
    const sortField = sort?.field;
    const sortOrder = sort?.order || 'desc';

    const data = await this.prisma.cartItem.findMany({
      where,
      skip,
      take: limit,
      orderBy: sortField ? { [sortField]: sortOrder } : { createdAt: 'desc' },
      include: {
        variant: {
          include: {
            product: true,
          },
        },
        bundle: true,
      },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Search cart items
   */
  async search(query: string, fields: string[]): Promise<CartItem[]> {
    return this.prisma.cartItem.findMany({
      where: {
        OR: [
          {
            variant: {
              product: {
                name: {
                  contains: query,
                  mode: 'insensitive',
                },
              },
            },
          },
          {
            bundle: {
              name: {
                contains: query,
                mode: 'insensitive',
              },
            },
          },
        ],
      },
      include: {
        variant: {
          include: {
            product: true,
          },
        },
        bundle: true,
      },
    });
  }

  /**
   * Count total cart items
   */
  async countTotal(filters?: FilterOptions): Promise<number> {
    return this.prisma.cartItem.count({
      where: filters as Prisma.CartItemWhereInput,
    });
  }

  // ========== CartItem-specific methods ==========

  /**
   * Find all items in a cart
   */
  async findByCartId(cartId: number): Promise<CartItem[]> {
    return this.prisma.cartItem.findMany({
      where: { cartId },
      include: {
        variant: {
          include: {
            product: true,
            variantImages: true,
            variantInventories: true,
          },
        },
        bundle: {
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
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  /**
   * Find cart item by cart and variant
   */
  async findByCartAndVariant(
    cartId: number,
    variantId: number | null,
  ): Promise<CartItem | null> {
    if (!variantId) return null;

    return this.prisma.cartItem.findFirst({
      where: {
        cartId,
        variantId,
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

  /**
   * Find cart item by cart and bundle
   */
  async findByCartAndBundle(
    cartId: number,
    bundleId: number | null,
  ): Promise<CartItem | null> {
    if (!bundleId) return null;

    return this.prisma.cartItem.findFirst({
      where: {
        cartId,
        bundleId,
      },
      include: {
        bundle: true,
      },
    });
  }

  /**
   * Delete all items in a cart
   */
  async deleteByCartId(cartId: number): Promise<number> {
    const result = await this.prisma.cartItem.deleteMany({
      where: { cartId },
    });

    return result.count;
  }

  /**
   * Bulk create cart items
   */
  async bulkCreate(items: Partial<CartItem>[]): Promise<number> {
    const result = await this.prisma.cartItem.createMany({
      data: items as Prisma.CartItemCreateManyInput[],
    });

    return result.count;
  }

  /**
   * Get cart item count for a cart
   */
  async getCartItemCount(cartId: number): Promise<number> {
    return this.prisma.cartItem.count({
      where: { cartId },
    });
  }

  /**
   * Get total quantity of items in cart
   */
  async getTotalQuantity(cartId: number): Promise<number> {
    const result = await this.prisma.cartItem.aggregate({
      where: { cartId },
      _sum: {
        quantity: true,
      },
    });

    return result._sum.quantity || 0;
  }
}

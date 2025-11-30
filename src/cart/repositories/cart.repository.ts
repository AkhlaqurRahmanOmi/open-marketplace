import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Cart, CartStatus, Prisma } from '@prisma/client';
import { BaseRepository } from '../../shared/repository/base.repository';
import { PrismaService } from '../../core/config/prisma/prisma.service';
import {
  PaginatedResult,
  QueryOptions,
  FilterOptions,
} from '../../shared/types';

@Injectable()
export class CartRepository extends BaseRepository<Cart, number> {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  /**
   * Find cart by ID with items included
   */
  async findById(id: number): Promise<Cart | null> {
    return this.prisma.cart.findUnique({
      where: { id },
      include: {
        cartItems: {
          include: {
            variant: {
              include: {
                product: true,
                variantImages: true,
              },
            },
            bundle: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * Find all carts
   */
  async findAll(): Promise<Cart[]> {
    return this.prisma.cart.findMany({
      include: {
        cartItems: true,
      },
    });
  }

  /**
   * Create a new cart
   */
  async create(data: Partial<Cart>): Promise<Cart> {
    return this.prisma.cart.create({
      data: data as Prisma.CartCreateInput,
      include: {
        cartItems: true,
      },
    });
  }

  /**
   * Update cart
   */
  async update(id: number, data: Partial<Cart>): Promise<Cart> {
    return this.prisma.cart.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: {
        cartItems: true,
      },
    });
  }

  /**
   * Delete cart
   */
  async delete(id: number): Promise<void> {
    await this.prisma.cart.delete({
      where: { id },
    });
  }

  /**
   * Find carts with filters and pagination
   */
  async findWithFilters(options: QueryOptions): Promise<PaginatedResult<Cart>> {
    const {
      pagination = { page: 1, limit: 10 },
      filters = {},
      sort = { field: 'createdAt', order: 'desc' },
    } = options;

    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const where: Prisma.CartWhereInput = {};

    // Apply filters
    if (filters.status) {
      where.status = filters.status as CartStatus;
    }
    if (filters.userId) {
      where.userId = filters.userId;
    }
    if (filters.sessionId) {
      where.sessionId = filters.sessionId;
    }

    // Count total items
    const total = await this.prisma.cart.count({ where });

    // Extract sort values for type safety
    const sortField = sort?.field;
    const sortOrder = sort?.order || 'desc';

    // Fetch data
    const data = await this.prisma.cart.findMany({
      where,
      skip,
      take: limit,
      orderBy: sortField ? { [sortField]: sortOrder } : { createdAt: 'desc' },
      include: {
        cartItems: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
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
   * Search carts
   */
  async search(query: string, fields: string[]): Promise<Cart[]> {
    // For cart, search by user email or sessionId
    return this.prisma.cart.findMany({
      where: {
        OR: [
          {
            user: {
              email: {
                contains: query,
                mode: 'insensitive',
              },
            },
          },
          {
            sessionId: {
              contains: query,
              mode: 'insensitive',
            },
          },
        ],
      },
      include: {
        cartItems: true,
        user: true,
      },
    });
  }

  /**
   * Count total carts with optional filters
   */
  async countTotal(filters?: FilterOptions): Promise<number> {
    return this.prisma.cart.count({
      where: filters as Prisma.CartWhereInput,
    });
  }

  // ========== Cart-specific methods ==========

  /**
   * Find active cart by user ID
   */
  async findActiveByUserId(userId: number): Promise<Cart | null> {
    return this.prisma.cart.findFirst({
      where: {
        userId,
        status: CartStatus.active,
      },
      include: {
        cartItems: {
          include: {
            variant: {
              include: {
                product: true,
                variantImages: true,
              },
            },
            bundle: true,
          },
        },
      },
    });
  }

  /**
   * Find cart by session ID
   */
  async findBySessionId(sessionId: string): Promise<Cart | null> {
    try {
      if (!sessionId || sessionId.trim() === '') {
        throw new BadRequestException('Session ID is required');
      }

      return this.prisma.cart.findUnique({
        where: { sessionId },
        include: {
          cartItems: {
            include: {
              variant: {
                include: {
                  product: true,
                  variantImages: true,
                },
              },
              bundle: true,
            },
          },
        },
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new Error(`Failed to find cart by session ID: ${error.message}`);
    }
  }


  /**
   * Find abandoned carts (for email reminders)
   */
  async findAbandoned(daysInactive: number = 7): Promise<Cart[]> {
    try {
      if (daysInactive < 0) {
        throw new BadRequestException('Days inactive must be non-negative');
      }

      const threshold = new Date();
      threshold.setDate(threshold.getDate() - daysInactive);

      return this.prisma.cart.findMany({
        where: {
          status: CartStatus.abandoned,
          lastActivityAt: {
            lt: threshold,
          },
          userId: {
            not: null,
          },
        },
        include: {
          cartItems: {
            include: {
              variant: {
                include: {
                  product: true,
                },
              },
              bundle: true,
            },
          },
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new Error(`Failed to find abandoned carts: ${error.message}`);
    }
  }


  /**
   * Mark carts as abandoned
   */
  async markAsAbandoned(daysInactive: number = 7): Promise<number> {
    try {
      if (daysInactive < 0) {
        throw new BadRequestException('Days inactive must be non-negative');
      }

      const threshold = new Date();
      threshold.setDate(threshold.getDate() - daysInactive);

      const result = await this.prisma.cart.updateMany({
        where: {
          status: CartStatus.active,
          userId: { not: null },
          lastActivityAt: {
            lt: threshold,
          },
        },
        data: {
          status: CartStatus.abandoned,
        },
      });

      return result.count;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new Error(`Failed to mark carts as abandoned: ${error.message}`);
    }
  }


  /*
  * Mark as cart expire
  * */
  async markAsExpired(
    anonymousDays: number = 7,
    authenticatedDays: number = 30,
  ): Promise<number> {
    const now = new Date();

    const anonymousThreshold = new Date();
    anonymousThreshold.setDate(now.getDate() - anonymousDays);

    const authenticatedThreshold = new Date();
    authenticatedThreshold.setDate(now.getDate() - authenticatedDays);

    const result = await this.prisma.cart.updateMany({
      where: {
        OR: [
          {
            // Anonymous carts
            status: CartStatus.active,
            userId: null,
            lastActivityAt: {
              lt: anonymousThreshold,
            },
          },
          {
            // Authenticated abandoned carts
            status: CartStatus.abandoned,
            userId: { not: null },
            lastActivityAt: {
              lt: authenticatedThreshold,
            },
          },
        ],
      },
      data: {
        status: CartStatus.expired,
      },
    });

    return result.count;
  }

  /**
   * Delete expired carts
   */
  async deleteExpired(): Promise<number> {
    try {
      const result = await this.prisma.cart.deleteMany({
        where: {
          status: CartStatus.expired,
        },
      });

      return result.count;
    } catch (error) {
      throw new Error(`Failed to delete expired carts: ${error.message}`);
    }
  }


  /**
   * Update last activity timestamp
   */
  async touchCart(id: number): Promise<void> {
    await this.prisma.cart.update({
      where: { id },
      data: {
        lastActivityAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  // ========== Report Methods ==========

  /**
   * Get cart statistics for date range
   */
  async getCartStatistics(startDate: Date, endDate: Date) {
    const [totalCarts, convertedCarts, abandonedCarts] = await Promise.all([
      // Total carts created
      this.prisma.cart.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),
      // Converted carts
      this.prisma.cart.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          status: CartStatus.converted,
        },
      }),
      // Abandoned carts
      this.prisma.cart.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          status: CartStatus.abandoned,
        },
      }),
    ]);

    return {
      totalCarts,
      convertedCarts,
      abandonedCarts,
      conversionRate: totalCarts > 0 ? (convertedCarts / totalCarts) * 100 : 0,
      abandonmentRate: totalCarts > 0 ? (abandonedCarts / totalCarts) * 100 : 0,
    };
  }

  /**
   * Get abandoned cart details with user info
   */
  async getAbandonedCartDetails(startDate: Date, endDate: Date, limit?: number) {
    return this.prisma.cart.findMany({
      where: {
        status: CartStatus.abandoned,
        lastActivityAt: {
          gte: startDate,
          lte: endDate,
        },
        userId: {
          not: null,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        cartItems: {
          include: {
            variant: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        lastActivityAt: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Get average cart value
   */
  async getAverageCartValue(startDate: Date, endDate: Date) {
    try {
      const cartTotals = await this.prisma.cart.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          cartItems: {
            some: {},
          },
        },
        select: {
          cartItems: {
            select: {
              unitPrice: true,
              quantity: true,
            },
          },
        },
      });

      if (cartTotals.length === 0) return 0;

      const totalValue = cartTotals.reduce((sum, cart) => {
        const cartValue = cart.cartItems.reduce(
          (cartSum, item) => cartSum + item.unitPrice * item.quantity,
          0,
        );
        return sum + cartValue;
      }, 0);

      return totalValue / cartTotals.length;
    } catch (error) {
      throw new Error(`Failed to calculate average cart value: ${error.message}`);
    }
  }

}

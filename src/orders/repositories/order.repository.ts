import { Injectable } from '@nestjs/common';
import { Order } from '@prisma/client';
import { PrismaService } from '../../core/config/prisma/prisma.service';
import { BaseRepository } from '../../shared/repository/base.repository';
import { UnitOfWorkService } from '../../shared/services/unit-of-work.service';
import {
  FilterOptions,
  PaginatedResult,
  QueryOptions,
} from '../../shared/types';
import { OrderFilterDto } from '../dtos';

@Injectable()
export class OrderRepository extends BaseRepository<Order, number> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly unitOfWork: UnitOfWorkService,
  ) {
    super();
  }

  async findById(id: number): Promise<Order | null> {
    return this.prisma.order.findUnique({
      where: { id },
      include: {
        user: true,
        orderItems: {
          include: {
            variant: {
              include: {
                product: true,
              },
            },
            bundle: true,
          },
        },
        billingAddress: true,
        shippingAddress: true,
        payments: true,
        shipments: true,
        orderStatusHistories: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async findAll(): Promise<Order[]> {
    return this.prisma.order.findMany({
      include: {
        user: true,
        orderItems: {
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

  async create(data: Partial<Order>): Promise<Order> {
    return this.prisma.order.create({
      data: data as any,
      include: {
        orderItems: {
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
        },
        billingAddress: true,
        shippingAddress: true,
      },
    });
  }

  async update(id: number, data: Partial<Order>): Promise<Order> {
    return this.prisma.order.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
      include: {
        orderItems: {
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
        },
        billingAddress: true,
        shippingAddress: true,
      },
    });
  }

  async delete(id: number): Promise<void> {
    // Orders are typically not deleted, but status changed to cancelled
    await this.prisma.order.update({
      where: { id },
      data: { currentStatus: 'cancelled' },
    });
  }

  async findWithFilters(
    options: QueryOptions,
  ): Promise<PaginatedResult<Order>> {
    const {
      filters = {},
      sort,
      pagination = { page: 1, limit: 10 },
      search,
    } = options;

    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const where: any = { ...filters };

    if (search?.query) {
      where.OR = [
        { externalRef: { contains: search.query, mode: 'insensitive' } },
        { user: { email: { contains: search.query, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: sort ? { [sort.field]: sort.order } : { createdAt: 'desc' },
        include: {
          user: true,
          orderItems: {
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
      this.prisma.order.count({ where }),
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

  //new one
  async findOrdersWithFilters(filterDto: OrderFilterDto): Promise<PaginatedResult<Order>> {
    const queryOptions: QueryOptions = {
      filters: {},
      pagination: {
        page: filterDto.page || 1,
        limit: filterDto.limit || 10,
      },
    };

    // Apply filters from DTO
    if (filterDto.status) {
      queryOptions.filters!.currentStatus = filterDto.status;
    }

    if (filterDto.userId) {
      queryOptions.filters!.userId = filterDto.userId;
    }

    if (filterDto.startDate || filterDto.endDate) {
      queryOptions.filters!.createdAt = {
        ...(filterDto.startDate && { gte: new Date(filterDto.startDate) }),
        ...(filterDto.endDate && { lte: new Date(filterDto.endDate) }),
      };
    }

    if (filterDto.minAmount || filterDto.maxAmount) {
      queryOptions.filters!.totalAmount = {
        ...(filterDto.minAmount && { gte: filterDto.minAmount }),
        ...(filterDto.maxAmount && { lte: filterDto.maxAmount }),
      };
    }

    if (filterDto.search) {
      queryOptions.search = {
        query: filterDto.search,
        fields: ['externalRef'],
      };
    }

    if (filterDto.sortBy) {
      queryOptions.sort = {
        field: filterDto.sortBy,
        order: filterDto.sortOrder || 'asc',
      };
    }

    return this.findWithFilters(queryOptions);
  }

  async search(query: string, fields: string[]): Promise<Order[]> {
    const where: any = {
      OR: [
        { externalRef: { contains: query, mode: 'insensitive' } },
        { user: { email: { contains: query, mode: 'insensitive' } } },
      ],
    };

    return this.prisma.order.findMany({
      where,
      include: {
        user: true,
        orderItems: {
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
    return this.prisma.order.count({
      where: filters,
    });
  }

  // Order-specific methods
  async findByUserId(userId: number): Promise<Order[]> {
    return this.prisma.order.findMany({
      where: { userId },
      include: {
        orderItems: {
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

  async findByStatus(status: string): Promise<Order[]> {
    return this.prisma.order.findMany({
      where: { currentStatus: status as any },
      include: {
        user: true,
        orderItems: true,
      },
    });
  }

  async updateStatus(id: number, status: string, note?: string): Promise<Order> {
    return this.unitOfWork.transaction(async (tx) => {
      // Update order status
      const order = await tx.order.update({
        where: { id },
        data: { currentStatus: status as any, updatedAt: new Date() },
      });

      // Add status history
      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          status,
          note,
        },
      });

      return order;
    });
  }

  // ========== Report Methods ==========

  /**
   * Get sales aggregation for date range
   */
  async getSalesAggregation(startDate: Date, endDate: Date) {
    return this.prisma.order.aggregate({
      where: {
        placedAt: {
          gte: startDate,
          lte: endDate,
        },
        currentStatus: {
          notIn: ['cancelled'],
        },
      },
      _sum: {
        totalAmount: true,
        subtotalAmount: true,
        discountAmount: true,
        taxAmount: true,
        shippingAmount: true,
      },
      _count: {
        id: true,
      },
      _avg: {
        totalAmount: true,
      },
    });
  }

  /**
   * Get order status breakdown
   */
  async getStatusBreakdown(startDate: Date, endDate: Date) {
    return this.prisma.order.groupBy({
      by: ['currentStatus'],
      where: {
        placedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: {
        id: true,
      },
      _sum: {
        totalAmount: true,
      },
    });
  }

  /**
   * Get daily order trends
   */
  async getDailyTrends(startDate: Date, endDate: Date) {
    return this.prisma.$queryRaw<Array<{ date: Date; orderCount: bigint; revenue: number }>>`
      SELECT
        DATE(placed_at) as date,
        COUNT(*)::bigint as "orderCount",
        SUM(total_amount)::float as revenue
      FROM "Order"
      WHERE placed_at >= ${startDate}
        AND placed_at <= ${endDate}
        AND current_status != 'cancelled'
      GROUP BY DATE(placed_at)
      ORDER BY date ASC
    `;
  }

  /**
   * Get top customers by revenue
   */
  async getTopCustomersByRevenue(startDate: Date, endDate: Date, limit: number = 10) {
    return this.prisma.order.groupBy({
      by: ['userId'],
      where: {
        placedAt: {
          gte: startDate,
          lte: endDate,
        },
        currentStatus: {
          notIn: ['cancelled'],
        },
      },
      _sum: {
        totalAmount: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          totalAmount: 'desc',
        },
      },
      take: limit,
    });
  }

  /**
   * Get best selling products by quantity
   */
  async getBestSellingProducts(startDate: Date, endDate: Date, limit: number = 10) {
    return this.prisma.orderItem.groupBy({
      by: ['variantId'],
      where: {
        order: {
          placedAt: {
            gte: startDate,
            lte: endDate,
          },
          currentStatus: {
            notIn: ['cancelled'],
          },
        },
        variantId: {
          not: null,
        },
      },
      _sum: {
        quantity: true,
        lineTotal: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: limit,
    });
  }

  /**
   * Get revenue by category
   */
  async getRevenueByCategory(startDate: Date, endDate: Date) {
    return this.prisma.$queryRaw<
      Array<{ categoryId: number; categoryName: string; revenue: number; orderCount: bigint }>
    >`
      SELECT
        c.id as "categoryId",
        c.name as "categoryName",
        SUM(oi.line_total)::float as revenue,
        COUNT(DISTINCT oi.order_id)::bigint as "orderCount"
      FROM "OrderItem" oi
      INNER JOIN "Variant" v ON oi.variant_id = v.id
      INNER JOIN "Product" p ON v.product_id = p.id
      INNER JOIN "ProductCategory" pc ON p.id = pc.product_id
      INNER JOIN "Category" c ON pc.category_id = c.id
      INNER JOIN "Order" o ON oi.order_id = o.id
      WHERE o.placed_at >= ${startDate}
        AND o.placed_at <= ${endDate}
        AND o.current_status != 'cancelled'
      GROUP BY c.id, c.name
      ORDER BY revenue DESC
    `;
  }

  /**
   * Get average order value trends
   */
  async getAOVTrends(startDate: Date, endDate: Date) {
    return this.prisma.$queryRaw<
      Array<{ date: Date; avgOrderValue: number; orderCount: bigint }>
    >`
      SELECT
        DATE(placed_at) as date,
        AVG(total_amount)::float as "avgOrderValue",
        COUNT(*)::bigint as "orderCount"
      FROM "Order"
      WHERE placed_at >= ${startDate}
        AND placed_at <= ${endDate}
        AND current_status != 'cancelled'
      GROUP BY DATE(placed_at)
      ORDER BY date ASC
    `;
  }

  // ========================
  // Phase 6: Multi-Vendor Order Queries
  // ========================

  /**
   * Find orders that contain items from a specific organization
   * Vendors only see orders containing their items
   */
  async findByOrganization(
    organizationId: number,
    filters: OrderFilterDto,
  ): Promise<PaginatedResult<Order>> {
    const { page = 1, limit = 10, status, search, startDate, endDate } = filters;
    const skip = (page - 1) * limit;

    const where: any = {
      orderItems: {
        some: { organizationId }, // Only orders with this org's items
      },
    };

    // Apply status filter
    if (status) {
      where.currentStatus = status;
    }

    // Apply search filter
    if (search) {
      where.OR = [
        { externalRef: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Apply date range filter
    if (startDate || endDate) {
      where.placedAt = {};
      if (startDate) where.placedAt.gte = new Date(startDate);
      if (endDate) where.placedAt.lte = new Date(endDate);
    }

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          orderItems: {
            where: { organizationId }, // Only this org's items
            include: {
              variant: {
                include: {
                  product: true,
                },
              },
            },
          },
          shippingAddress: true,
          orderStatusHistories: {
            take: 5,
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      this.prisma.order.count({ where }),
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

  /**
   * Find a single order by ID, filtered to show only items from specific organization
   */
  async findByIdForOrganization(
    orderId: number,
    organizationId: number,
  ): Promise<Order | null> {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        orderItems: {
          some: { organizationId },
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
        orderItems: {
          where: { organizationId }, // Only this org's items
          include: {
            variant: {
              include: {
                product: true,
              },
            },
            fulfillmentItems: {
              include: {
                shipment: true,
              },
            },
          },
        },
        shippingAddress: true,
        billingAddress: true,
        shipments: {
          where: { organizationId }, // Only this org's shipments
        },
        orderStatusHistories: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return order;
  }

  /**
   * Get order items summary for an organization
   */
  async getOrganizationOrderStats(
    organizationId: number,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any> {
    const where: any = {
      organizationId,
    };

    if (startDate || endDate) {
      where.order = {
        placedAt: {},
      };
      if (startDate) where.order.placedAt.gte = startDate;
      if (endDate) where.order.placedAt.lte = endDate;
    }

    const stats = await this.prisma.orderItem.aggregate({
      where,
      _sum: {
        lineTotal: true,
        organizationAmount: true,
        platformFeeAmount: true,
      },
      _count: true,
    });

    return {
      totalItems: stats._count,
      totalRevenue: stats._sum.lineTotal || 0,
      vendorEarnings: stats._sum.organizationAmount || 0,
      platformFees: stats._sum.platformFeeAmount || 0,
    };
  }

  /**
   * Group items by organization for order splitting logic
   */
  groupItemsByOrganization(orderItems: any[]): Map<number, any[]> {
    const grouped = new Map<number, any[]>();

    for (const item of orderItems) {
      const orgId = item.variant?.product?.organizationId || item.organizationId;
      if (!orgId) continue;

      if (!grouped.has(orgId)) {
        grouped.set(orgId, []);
      }
      grouped.get(orgId)!.push(item);
    }

    return grouped;
  }
}

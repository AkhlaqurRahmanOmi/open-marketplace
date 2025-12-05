import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/core/config/prisma/prisma.service';
import { BaseRepository } from 'src/shared/repository/base.repository';
import { Refund, Prisma } from '@prisma/client';

export type RefundWithRelations = Refund & {
  refundItems?: any[];
  order?: any;
  organization?: any;
  payment?: any;
};

@Injectable()
export class RefundRepository extends BaseRepository<Refund, number> {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private readonly baseInclude = {
    refundItems: {
      include: {
        orderItem: {
          include: {
            variant: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    organizationId: true,
                  },
                },
              },
            },
          },
        },
      },
    },
    order: {
      select: {
        id: true,
        externalRef: true,
        currentStatus: true,
        totalAmount: true,
        userId: true,
      },
    },
    organization: {
      select: {
        id: true,
        name: true,
        email: true,
        type: true,
      },
    },
    payment: {
      select: {
        id: true,
        transactionId: true,
        status: true,
        method: true,
      },
    },
  };

  async findById(id: number): Promise<RefundWithRelations | null> {
    return this.prisma.refund.findUnique({
      where: { id },
      include: this.baseInclude,
    });
  }

  async findAll(): Promise<Refund[]> {
    return this.prisma.refund.findMany({
      include: this.baseInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: any): Promise<Refund> {
    return this.prisma.refund.create({
      data,
      include: this.baseInclude,
    });
  }

  async update(id: number, data: Prisma.RefundUpdateInput): Promise<Refund> {
    return this.prisma.refund.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: this.baseInclude,
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.refund.delete({
      where: { id },
    });
  }

  async findWithFilters(options: any): Promise<any> {
    const {
      filters = {},
      pagination = { page: 1, limit: 10 },
      sort,
    } = options;
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const where: Prisma.RefundWhereInput = {};

    // Apply filters
    if (filters.orderId) {
      where.orderId = filters.orderId;
    }

    if (filters.organizationId) {
      where.organizationId = filters.organizationId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.fromDate || filters.toDate) {
      where.createdAt = {};
      if (filters.fromDate) {
        where.createdAt.gte = new Date(filters.fromDate);
      }
      if (filters.toDate) {
        where.createdAt.lte = new Date(filters.toDate);
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.refund.findMany({
        where,
        skip,
        take: limit,
        orderBy: sort
          ? { [sort.field]: sort.order }
          : { createdAt: 'desc' },
        include: this.baseInclude,
      }),
      this.prisma.refund.count({ where }),
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

  async search(query: string, fields: string[]): Promise<Refund[]> {
    return this.prisma.refund.findMany({
      where: {
        OR: [
          { reason: { contains: query, mode: 'insensitive' } },
          {
            order: {
              externalRef: { contains: query, mode: 'insensitive' },
            },
          },
        ],
      },
      include: this.baseInclude,
      take: 20,
    });
  }

  async countTotal(filters?: any): Promise<number> {
    return this.prisma.refund.count({
      where: filters,
    });
  }

  // Specialized methods for refund operations

  /**
   * Find all refunds for a specific order
   */
  async findByOrderId(orderId: number): Promise<Refund[]> {
    return this.prisma.refund.findMany({
      where: { orderId },
      include: this.baseInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find all refunds for a specific organization (vendor)
   */
  async findByOrganizationId(organizationId: number): Promise<Refund[]> {
    return this.prisma.refund.findMany({
      where: { organizationId },
      include: this.baseInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Count refunds by organization for stats
   */
  async countByOrganization(organizationId: number): Promise<number> {
    return this.prisma.refund.count({
      where: { organizationId },
    });
  }

  /**
   * Find refunds by status for an organization
   */
  async findByOrganizationAndStatus(
    organizationId: number,
    status: string,
  ): Promise<Refund[]> {
    return this.prisma.refund.findMany({
      where: {
        organizationId,
        status: status as any,
      },
      include: this.baseInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get total refund amount by organization
   */
  async getTotalRefundAmountByOrganization(
    organizationId: number,
  ): Promise<number> {
    const result = await this.prisma.refund.aggregate({
      where: {
        organizationId,
        status: { in: ['approved' as any, 'completed' as any] },
      },
      _sum: {
        organizationAmount: true,
      },
    });

    return result._sum?.organizationAmount || 0;
  }

  /**
   * Get refund statistics for dashboard
   */
  async getRefundStats(organizationId?: number): Promise<any> {
    const where: Prisma.RefundWhereInput = organizationId
      ? { organizationId }
      : {};

    const [total, byStatus, totalAmount] = await Promise.all([
      this.prisma.refund.count({ where }),
      this.prisma.refund.groupBy({
        by: ['status'],
        where,
        _count: {
          id: true,
        },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.refund.aggregate({
        where: {
          ...where,
          status: { in: ['approved' as any, 'completed' as any] },
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    return {
      total,
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = {
          count: item._count.id,
          amount: item._sum.amount || 0,
        };
        return acc;
      }, {} as Record<string, any>),
      totalAmount: totalAmount._sum?.amount || 0,
    };
  }
}

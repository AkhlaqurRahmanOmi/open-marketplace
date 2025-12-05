import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/core/config/prisma/prisma.service';
import { BaseRepository } from 'src/shared/repository/base.repository';
import {
  VendorBalance,
  VendorBalanceTransaction,
  Prisma,
} from '@prisma/client';

export type VendorBalanceWithRelations = VendorBalance & {
  organization?: any;
  transactions?: VendorBalanceTransaction[];
  payouts?: any[];
  _count?: {
    transactions: number;
    payouts: number;
  };
};

@Injectable()
export class VendorBalanceRepository extends BaseRepository<
  VendorBalance,
  number
> {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private readonly baseInclude = {
    _count: {
      select: {
        transactions: true,
        payouts: true,
      },
    },
  };

  private readonly detailedInclude = {
    organization: {
      select: {
        id: true,
        name: true,
        email: true,
        type: true,
        feeType: true,
        feeAmount: true,
      },
    },
    transactions: {
      take: 10,
      orderBy: { createdAt: 'desc' as const },
    },
    payouts: {
      take: 5,
      orderBy: { createdAt: 'desc' as const },
    },
    _count: {
      select: {
        transactions: true,
        payouts: true,
      },
    },
  };

  async findById(id: number): Promise<VendorBalanceWithRelations | null> {
    return this.prisma.vendorBalance.findUnique({
      where: { id },
      include: this.detailedInclude,
    });
  }

  async findByOrganizationId(
    organizationId: number,
  ): Promise<VendorBalanceWithRelations | null> {
    return this.prisma.vendorBalance.findUnique({
      where: { organizationId },
      include: this.detailedInclude,
    });
  }

  async findAll(): Promise<VendorBalance[]> {
    return this.prisma.vendorBalance.findMany({
      include: this.baseInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: Partial<VendorBalance>): Promise<VendorBalance> {
    const { organizationId, ...rest } = data as any;

    return this.prisma.vendorBalance.create({
      data: {
        organization: {
          connect: { id: organizationId },
        },
        availableBalance: rest.availableBalance || 0,
        pendingBalance: rest.pendingBalance || 0,
        totalEarnings: rest.totalEarnings || 0,
        totalPaidOut: rest.totalPaidOut || 0,
      },
      include: this.baseInclude,
    });
  }

  async update(
    id: number,
    data: Partial<VendorBalance>,
  ): Promise<VendorBalance> {
    const updateData: any = { ...data };
    delete updateData.id;
    delete updateData.organizationId; // Cannot update organizationId
    delete updateData.createdAt;

    return this.prisma.vendorBalance.update({
      where: { id },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
      include: this.detailedInclude,
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.vendorBalance.delete({
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

    const where: Prisma.VendorBalanceWhereInput = { ...filters };

    const [data, total] = await Promise.all([
      this.prisma.vendorBalance.findMany({
        where,
        skip,
        take: limit,
        orderBy: sort
          ? { [sort.field]: sort.order }
          : { createdAt: 'desc' },
        include: this.baseInclude,
      }),
      this.prisma.vendorBalance.count({ where }),
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

  async search(query: string, fields: string[]): Promise<VendorBalance[]> {
    return this.prisma.vendorBalance.findMany({
      where: {
        organization: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
          ],
        },
      },
      include: this.baseInclude,
      take: 20,
    });
  }

  async countTotal(filters?: any): Promise<number> {
    return this.prisma.vendorBalance.count({
      where: filters,
    });
  }

  // Specialized methods for balance operations
  async updateBalance(
    balanceId: number,
    availableDelta: number,
    pendingDelta: number,
    earningsDelta: number,
  ): Promise<VendorBalance> {
    return this.prisma.vendorBalance.update({
      where: { id: balanceId },
      data: {
        availableBalance: { increment: availableDelta },
        pendingBalance: { increment: pendingDelta },
        totalEarnings: { increment: earningsDelta },
        updatedAt: new Date(),
      },
    });
  }

  async createTransaction(
    data: Prisma.VendorBalanceTransactionCreateInput,
  ): Promise<VendorBalanceTransaction> {
    return this.prisma.vendorBalanceTransaction.create({
      data,
    });
  }

  async getTransactionsByBalanceId(
    balanceId: number,
    limit: number = 50,
  ): Promise<VendorBalanceTransaction[]> {
    return this.prisma.vendorBalanceTransaction.findMany({
      where: { balanceId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getBalancesWithLowFunds(
    threshold: number = 0,
  ): Promise<VendorBalance[]> {
    return this.prisma.vendorBalance.findMany({
      where: {
        availableBalance: { lte: threshold },
      },
      include: this.baseInclude,
    });
  }

  async getBalancesSummary(): Promise<any> {
    const result = await this.prisma.vendorBalance.aggregate({
      _sum: {
        availableBalance: true,
        pendingBalance: true,
        totalEarnings: true,
        totalPaidOut: true,
      },
      _avg: {
        availableBalance: true,
        pendingBalance: true,
      },
      _count: true,
    });

    return result;
  }

  // Transaction History Methods (Phase 7)
  async getTransactionHistory(
    organizationId: number,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.prisma.vendorBalanceTransaction.findMany({
        where: {
          balance: {
            organizationId,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.vendorBalanceTransaction.count({
        where: {
          balance: {
            organizationId,
          },
        },
      }),
    ]);

    return {
      data: transactions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPayoutHistory(
    organizationId: number,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;

    const [payouts, total] = await Promise.all([
      this.prisma.vendorPayout.findMany({
        where: { organizationId },
        include: {
          payoutItems: {
            include: {
              orderItem: {
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
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.vendorPayout.count({
        where: { organizationId },
      }),
    ]);

    return {
      data: payouts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAllPayouts(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [payouts, total] = await Promise.all([
      this.prisma.vendorPayout.findMany({
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              payoutItems: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.vendorPayout.count(),
    ]);

    return {
      data: payouts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

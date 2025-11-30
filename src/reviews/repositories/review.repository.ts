import { Injectable } from '@nestjs/common';
import { Review } from '@prisma/client';
import { PrismaService } from '../../core/config/prisma/prisma.service';
import { BaseRepository } from '../../shared/repository/base.repository';
import {
  FilterOptions,
  PaginatedResult,
  QueryOptions,
} from '../../shared/types';

@Injectable()
export class ReviewRepository extends BaseRepository<Review, number> {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findById(id: number): Promise<Review | null> {
    return this.prisma.review.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
          },
        },
        reviewImages: true,
      },
    });
  }

  async findAll(): Promise<Review[]> {
    return this.prisma.review.findMany({
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        reviewImages: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: Partial<Review>): Promise<Review> {
    return this.prisma.review.create({
      data: data as any,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        reviewImages: true,
      },
    });
  }

  async update(id: number, data: Partial<Review>): Promise<Review> {
    return this.prisma.review.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        reviewImages: true,
      },
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.review.delete({
      where: { id },
    });
  }

  async findWithFilters(
    options: QueryOptions,
  ): Promise<PaginatedResult<Review>> {
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
      where.OR = search.fields.map((field) => ({
        [field]: {
          contains: search.query,
          mode: 'insensitive',
        },
      }));
    }

    const [data, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        skip,
        take: limit,
        orderBy: sort ? { [sort.field]: sort.order } : { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          reviewImages: true,
        },
      }),
      this.prisma.review.count({ where }),
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

  async search(query: string, fields: string[]): Promise<Review[]> {
    const where: any = {
      OR: fields.map((field) => ({
        [field]: {
          contains: query,
          mode: 'insensitive',
        },
      })),
    };

    return this.prisma.review.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        reviewImages: true,
      },
    });
  }

  async countTotal(filters?: FilterOptions): Promise<number> {
    return this.prisma.review.count({
      where: { ...filters },
    });
  }

  // Review-specific methods
  async findByProductId(productId: number): Promise<Review[]> {
    return this.prisma.review.findMany({
      where: {
        productId,
        status: 'approved',
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        reviewImages: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByUserId(userId: number): Promise<Review[]> {
    return this.prisma.review.findMany({
      where: { userId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
          },
        },
        reviewImages: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByUserAndProduct(
    userId: number,
    productId: number,
  ): Promise<Review | null> {
    return this.prisma.review.findFirst({
      where: {
        userId,
        productId,
      },
      include: {
        reviewImages: true,
      },
    });
  }

  async getProductStatistics(productId: number) {
    const reviews = await this.prisma.review.findMany({
      where: {
        productId,
        status: 'approved',
      },
      select: {
        rating: true,
      },
    });

    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0;

    const ratingDistribution = {
      1: reviews.filter((r) => r.rating === 1).length,
      2: reviews.filter((r) => r.rating === 2).length,
      3: reviews.filter((r) => r.rating === 3).length,
      4: reviews.filter((r) => r.rating === 4).length,
      5: reviews.filter((r) => r.rating === 5).length,
    };

    return {
      totalReviews,
      averageRating: Math.round(averageRating * 10) / 10,
      ratingDistribution,
    };
  }

  async checkUserPurchased(
    userId: number,
    productId: number,
  ): Promise<boolean> {
    const orderItem = await this.prisma.orderItem.findFirst({
      where: {
        variant: {
          productId,
        },
        order: {
          userId,
        },
      },
    });

    return !!orderItem;
  }
}

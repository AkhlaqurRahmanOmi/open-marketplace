import { Injectable } from '@nestjs/common';
import { ReviewImage } from '@prisma/client';
import { PrismaService } from '../../core/config/prisma/prisma.service';
import { BaseRepository } from '../../shared/repository/base.repository';
import {
  FilterOptions,
  PaginatedResult,
  QueryOptions,
} from '../../shared/types';

@Injectable()
export class ReviewImageRepository extends BaseRepository<
  ReviewImage,
  number
> {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findById(id: number): Promise<ReviewImage | null> {
    return this.prisma.reviewImage.findUnique({
      where: { id },
    });
  }

  async findAll(): Promise<ReviewImage[]> {
    return this.prisma.reviewImage.findMany();
  }

  async create(data: Partial<ReviewImage>): Promise<ReviewImage> {
    return this.prisma.reviewImage.create({
      data: data as any,
    });
  }

  async update(id: number, data: Partial<ReviewImage>): Promise<ReviewImage> {
    return this.prisma.reviewImage.update({
      where: { id },
      data,
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.reviewImage.delete({
      where: { id },
    });
  }

  async findWithFilters(
    options: QueryOptions,
  ): Promise<PaginatedResult<ReviewImage>> {
    const {
      filters = {},
      pagination = { page: 1, limit: 10 },
    } = options;

    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.reviewImage.findMany({
        where: filters,
        skip,
        take: limit,
      }),
      this.prisma.reviewImage.count({ where: filters }),
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

  async search(query: string, fields: string[]): Promise<ReviewImage[]> {
    return [];
  }

  async countTotal(filters?: FilterOptions): Promise<number> {
    return this.prisma.reviewImage.count({ where: filters });
  }

  // ReviewImage-specific methods
  async findByReviewId(reviewId: number): Promise<ReviewImage[]> {
    return this.prisma.reviewImage.findMany({
      where: { reviewId },
    });
  }

  async createMany(images: Partial<ReviewImage>[]): Promise<number> {
    const result = await this.prisma.reviewImage.createMany({
      data: images as any[],
    });
    return result.count;
  }

  async deleteByReviewId(reviewId: number): Promise<void> {
    await this.prisma.reviewImage.deleteMany({
      where: { reviewId },
    });
  }
}

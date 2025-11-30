import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Review } from '@prisma/client';
import { ReviewRepository } from '../repositories';
import {
  CreateReviewDto,
  UpdateReviewDto,
  ReviewFilterDto,
  UpdateReviewStatusDto,
} from '../dtos';
import { PaginatedResult, QueryOptions } from '../../shared/types';
import { PrismaService } from '../../core/config/prisma/prisma.service';

@Injectable()
export class ReviewManagementProvider {
  constructor(
    private readonly reviewRepository: ReviewRepository,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Create a new review
   */
  async createReview(
    userId: number,
    createReviewDto: CreateReviewDto,
  ): Promise<Review> {
    const { productId, orderItemId, rating, comment } = createReviewDto;

    // Validate product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || product.deletedAt) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // Check if user has purchased the product
    const hasPurchased = await this.reviewRepository.checkUserPurchased(
      userId,
      productId,
    );

    if (!hasPurchased) {
      throw new BadRequestException(
        'You can only review products you have purchased',
      );
    }

    // Check for duplicate review
    const existingReview = await this.reviewRepository.findByUserAndProduct(
      userId,
      productId,
    );

    if (existingReview) {
      throw new ConflictException(
        'You have already reviewed this product',
      );
    }

    // Create review with pending status
    return this.reviewRepository.create({
      userId,
      productId,
      orderItemId,
      rating,
      comment,
      status: 'pending',
    });
  }

  /**
   * Update a review
   */
  async updateReview(
    id: number,
    userId: number,
    updateReviewDto: UpdateReviewDto,
  ): Promise<Review> {
    const review = await this.reviewRepository.findById(id);

    if (!review) {
      throw new NotFoundException(`Review with ID ${id} not found`);
    }

    // Check ownership
    if (review.userId !== userId) {
      throw new ForbiddenException('You can only update your own reviews');
    }

    // Can only edit if status is pending
    if (review.status !== 'pending') {
      throw new BadRequestException(
        'You can only edit reviews that are pending approval',
      );
    }

    return this.reviewRepository.update(id, updateReviewDto);
  }

  /**
   * Delete a review
   */
  async deleteReview(id: number, userId: number): Promise<void> {
    const review = await this.reviewRepository.findById(id);

    if (!review) {
      throw new NotFoundException(`Review with ID ${id} not found`);
    }

    // Check ownership - users can only delete their own reviews
    if (review.userId !== userId) {
      throw new ForbiddenException('You can only delete your own reviews');
    }

    await this.reviewRepository.delete(id);
  }

  /**
   * Get a single review by ID
   */
  async getReviewById(id: number): Promise<Review> {
    const review = await this.reviewRepository.findById(id);

    if (!review) {
      throw new NotFoundException(`Review with ID ${id} not found`);
    }

    return review;
  }

  /**
   * Get all reviews with filtering, sorting, and pagination
   */
  async getAllReviews(
    filterDto: ReviewFilterDto,
  ): Promise<PaginatedResult<Review>> {
    const queryOptions: QueryOptions = {
      filters: {},
      pagination: {
        page: filterDto.page || 1,
        limit: filterDto.limit || 10,
      },
    };

    // Add filters
    if (filterDto.productId) {
      queryOptions.filters!.productId = filterDto.productId;
    }

    if (filterDto.userId) {
      queryOptions.filters!.userId = filterDto.userId;
    }

    if (filterDto.rating) {
      queryOptions.filters!.rating = filterDto.rating;
    }

    if (filterDto.status) {
      queryOptions.filters!.status = filterDto.status;
    }

    // Add sorting
    if (filterDto.sortBy) {
      queryOptions.sort = {
        field: filterDto.sortBy,
        order: filterDto.sortOrder || 'desc',
      };
    }

    return this.reviewRepository.findWithFilters(queryOptions);
  }

  /**
   * Get reviews for a specific product
   */
  async getProductReviews(productId: number): Promise<Review[]> {
    return this.reviewRepository.findByProductId(productId);
  }

  /**
   * Get reviews by a specific user
   */
  async getUserReviews(userId: number): Promise<Review[]> {
    return this.reviewRepository.findByUserId(userId);
  }

  /**
   * Update review status (admin only)
   */
  async updateReviewStatus(
    id: number,
    updateStatusDto: UpdateReviewStatusDto,
  ): Promise<Review> {
    const review = await this.reviewRepository.findById(id);

    if (!review) {
      throw new NotFoundException(`Review with ID ${id} not found`);
    }

    return this.reviewRepository.update(id, {
      status: updateStatusDto.status,
    });
  }

  /**
   * Get product review statistics
   */
  async getProductStatistics(productId: number) {
    return this.reviewRepository.getProductStatistics(productId);
  }
}

import { Injectable } from '@nestjs/common';
import {
  ReviewManagementProvider,
  ReviewImageManagementProvider,
} from './providers';
import {
  CreateReviewDto,
  UpdateReviewDto,
  ReviewFilterDto,
  UpdateReviewStatusDto,
} from './dtos';

/**
 * ReviewsService is a facade that exposes a simplified API
 * while coordinating multiple underlying providers.
 */
@Injectable()
export class ReviewsService {
  constructor(
    private readonly reviewManagement: ReviewManagementProvider,
    private readonly reviewImageManagement: ReviewImageManagementProvider,
  ) {}

  // ---------- Review CRUD ----------

  createReview(userId: number, dto: CreateReviewDto) {
    return this.reviewManagement.createReview(userId, dto);
  }

  updateReview(id: number, userId: number, dto: UpdateReviewDto) {
    return this.reviewManagement.updateReview(id, userId, dto);
  }

  deleteReview(id: number, userId: number) {
    return this.reviewManagement.deleteReview(id, userId);
  }

  getReviewById(id: number) {
    return this.reviewManagement.getReviewById(id);
  }

  getAllReviews(filterDto: ReviewFilterDto) {
    return this.reviewManagement.getAllReviews(filterDto);
  }

  getProductReviews(productId: number) {
    return this.reviewManagement.getProductReviews(productId);
  }

  getUserReviews(userId: number) {
    return this.reviewManagement.getUserReviews(userId);
  }

  getProductStatistics(productId: number) {
    return this.reviewManagement.getProductStatistics(productId);
  }

  // ---------- Review Status (Admin) ----------

  updateReviewStatus(id: number, dto: UpdateReviewStatusDto) {
    return this.reviewManagement.updateReviewStatus(id, dto);
  }

  // ---------- Review Images ----------

  addReviewImages(reviewId: number, userId: number, files: Express.Multer.File[]) {
    return this.reviewImageManagement.addReviewImages(reviewId, userId, files);
  }

  deleteReviewImage(imageId: number, userId: number) {
    return this.reviewImageManagement.deleteReviewImage(imageId, userId);
  }
}

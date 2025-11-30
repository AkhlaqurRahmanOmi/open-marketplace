import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ReviewImage } from '@prisma/client';
import { ReviewImageRepository, ReviewRepository } from '../repositories';
import { S3UploadService } from '../../shared/services/s3-upload.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ReviewImageManagementProvider {
  constructor(
    private readonly reviewImageRepository: ReviewImageRepository,
    private readonly reviewRepository: ReviewRepository,
    private readonly s3UploadService: S3UploadService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Add images to a review
   */
  async addReviewImages(
    reviewId: number,
    userId: number,
    files: Express.Multer.File[],
  ): Promise<ReviewImage[]> {
    // Verify review exists and belongs to user
    const review = await this.reviewRepository.findById(reviewId);

    if (!review) {
      throw new NotFoundException(`Review with ID ${reviewId} not found`);
    }

    if (review.userId !== userId) {
      throw new ForbiddenException('You can only add images to your own reviews');
    }

    // Check max images limit
    const maxImages = this.configService.get<number>('storage.upload.maxImagesPerReview') || 5;
    const existingImages = await this.reviewImageRepository.findByReviewId(reviewId);

    if (existingImages.length + files.length > maxImages) {
      throw new BadRequestException(
        `Maximum ${maxImages} images allowed per review`,
      );
    }

    // Upload images to S3
    const uploadResults = await this.s3UploadService.uploadFiles(
      files,
      'reviews',
    );

    // Save image URLs to database
    const imageRecords = uploadResults.map((result) => ({
      reviewId,
      imageUrl: result.fileUrl,
    }));

    await this.reviewImageRepository.createMany(imageRecords);

    // Return all images for the review
    return this.reviewImageRepository.findByReviewId(reviewId);
  }

  /**
   * Delete a specific review image
   */
  async deleteReviewImage(
    imageId: number,
    userId: number,
  ): Promise<void> {
    const image = await this.reviewImageRepository.findById(imageId);

    if (!image) {
      throw new NotFoundException('Review image not found');
    }

    // Get review to check ownership
    const review = await this.reviewRepository.findById(image.reviewId);

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    // Check ownership - users can only delete their own review images
    if (review.userId !== userId) {
      throw new ForbiddenException('You can only delete your own review images');
    }

    // Delete from S3
    await this.s3UploadService.deleteFile(image.imageUrl);

    // Delete from database
    await this.reviewImageRepository.delete(imageId);
  }

  /**
   * Get all images for a review
   */
  async getReviewImages(reviewId: number): Promise<ReviewImage[]> {
    return this.reviewImageRepository.findByReviewId(reviewId);
  }

  /**
   * Delete all images for a review (used when deleting review)
   */
  async deleteAllReviewImages(reviewId: number): Promise<void> {
    const images = await this.reviewImageRepository.findByReviewId(reviewId);

    if (images.length > 0) {
      // Delete all images from S3
      const imageUrls = images.map((img) => img.imageUrl);
      await this.s3UploadService.deleteFiles(imageUrls);

      // Delete from database
      await this.reviewImageRepository.deleteByReviewId(reviewId);
    }
  }
}

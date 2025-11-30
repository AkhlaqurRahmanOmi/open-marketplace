import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { Auth } from '../auth/decorator/auth.decorator';
import { AuthType } from '../auth/enums/auth-type.enum';
import { Roles } from '../auth/decorator/roles.decorator';
import { Permissions } from '../auth/decorator/permissions.decorator';
import { ActiveUser } from '../auth/decorator/active-user.decorator';
import type { ActiveUserData } from '../auth/interfaces/active-user-data.interface';
import { RelatedLinks } from '../shared/decorators/related-links.decorator';
import { CacheTTL } from '../shared/decorators/cache-ttl.decorator';
import { FileValidationPipe } from '../shared/pipes/file-validation.pipe';

import { ReviewsService } from './reviews.service';
import {
  CreateReviewDto,
  UpdateReviewDto,
  ReviewFilterDto,
  UpdateReviewStatusDto,
} from './dtos';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // ============ Public Review Endpoints ============

  @Get()
  @Auth(AuthType.None)
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300000)
  @HttpCode(HttpStatus.OK)
  @RelatedLinks({
    review: {
      path: '/api/v1/reviews/{id}',
      method: 'GET',
      rel: 'item',
      description: 'Get single review',
    },
  })
  getAllReviews(@Query() filterDto: ReviewFilterDto) {
    return this.reviewsService.getAllReviews(filterDto);
  }

  @Get(':id')
  @Auth(AuthType.None)
  @HttpCode(HttpStatus.OK)
  @RelatedLinks({
    self: {
      path: '/api/v1/reviews/{id}',
      method: 'GET',
      rel: 'self',
      description: 'Get this review',
    },
  })
  getReviewById(@Param('id', ParseIntPipe) id: number) {
    return this.reviewsService.getReviewById(id);
  }

  @Get('products/:productId')
  @Auth(AuthType.None)
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300000)
  @HttpCode(HttpStatus.OK)
  @RelatedLinks({
    product: {
      path: '/api/v1/catalog/products/{productId}',
      method: 'GET',
      rel: 'related',
      description: 'Get product',
    },
    statistics: {
      path: '/api/v1/reviews/products/{productId}/statistics',
      method: 'GET',
      rel: 'related',
      description: 'Get review statistics',
    },
  })
  getProductReviews(@Param('productId', ParseIntPipe) productId: number) {
    return this.reviewsService.getProductReviews(productId);
  }

  @Get('products/:productId/statistics')
  @Auth(AuthType.None)
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(600000)
  @HttpCode(HttpStatus.OK)
  getProductStatistics(@Param('productId', ParseIntPipe) productId: number) {
    return this.reviewsService.getProductStatistics(productId);
  }

  // ============ Authenticated User Endpoints ============

  @Get('my-reviews')
  @Auth(AuthType.Bearer)
  @HttpCode(HttpStatus.OK)
  @RelatedLinks({
    review: {
      path: '/api/v1/reviews/{id}',
      method: 'GET',
      rel: 'item',
      description: 'Get single review',
    },
  })
  getUserReviews(@ActiveUser() user: ActiveUserData) {
    return this.reviewsService.getUserReviews(user.sub);
  }

  @Post()
  @Auth(AuthType.Bearer)
  @Permissions('reviews:create')
  @HttpCode(HttpStatus.CREATED)
  @RelatedLinks({
    self: {
      path: '/api/v1/reviews/{id}',
      method: 'GET',
      rel: 'self',
      description: 'Get created review',
    },
    update: {
      path: '/api/v1/reviews/{id}',
      method: 'PATCH',
      rel: 'edit',
      description: 'Update review',
    },
    delete: {
      path: '/api/v1/reviews/{id}',
      method: 'DELETE',
      rel: 'delete',
      description: 'Delete review',
    },
    addImages: {
      path: '/api/v1/reviews/{id}/images',
      method: 'POST',
      rel: 'action',
      description: 'Add images to review',
    },
  })
  createReview(
    @ActiveUser() user: ActiveUserData,
    @Body() createReviewDto: CreateReviewDto,
  ) {
    return this.reviewsService.createReview(user.sub, createReviewDto);
  }

  @Patch(':id')
  @Auth(AuthType.Bearer)
  @Permissions('reviews:update')
  @HttpCode(HttpStatus.OK)
  @RelatedLinks({
    self: {
      path: '/api/v1/reviews/{id}',
      method: 'GET',
      rel: 'self',
      description: 'Get updated review',
    },
  })
  updateReview(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() user: ActiveUserData,
    @Body() updateReviewDto: UpdateReviewDto,
  ) {
    return this.reviewsService.updateReview(id, user.sub, updateReviewDto);
  }

  @Delete(':id')
  @Auth(AuthType.Bearer)
  @Permissions('reviews:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteReview(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() user: ActiveUserData,
  ) {
    await this.reviewsService.deleteReview(id, user.sub);
  }

  // ============ Review Image Endpoints (File Upload) ============

  @Post(':id/images')
  @Auth(AuthType.Bearer)
  @Permissions('reviews:create')
  @UseInterceptors(FilesInterceptor('images', 5))
  @HttpCode(HttpStatus.CREATED)
  @RelatedLinks({
    review: {
      path: '/api/v1/reviews/{id}',
      method: 'GET',
      rel: 'related',
      description: 'Get review',
    },
  })
  async uploadReviewImages(
    @Param('id', ParseIntPipe) reviewId: number,
    @UploadedFiles(FileValidationPipe) files: Express.Multer.File[],
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.reviewsService.addReviewImages(reviewId, user.sub, files);
  }

  @Delete(':reviewId/images/:imageId')
  @Auth(AuthType.Bearer)
  @Permissions('reviews:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteReviewImage(
    @Param('reviewId', ParseIntPipe) reviewId: number,
    @Param('imageId', ParseIntPipe) imageId: number,
    @ActiveUser() user: ActiveUserData,
  ) {
    await this.reviewsService.deleteReviewImage(imageId, user.sub);
  }

  // ============ Admin Moderation Endpoints ============

  @Patch(':id/status')
  @Permissions('reviews:approve')
  @HttpCode(HttpStatus.OK)
  @RelatedLinks({
    self: {
      path: '/api/v1/reviews/{id}',
      method: 'GET',
      rel: 'self',
      description: 'Get updated review',
    },
  })
  updateReviewStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateReviewStatusDto,
  ) {
    return this.reviewsService.updateReviewStatus(id, updateStatusDto);
  }
}

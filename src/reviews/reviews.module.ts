import { Module } from '@nestjs/common';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { ReviewRepository, ReviewImageRepository } from './repositories';
import {
  ReviewManagementProvider,
  ReviewImageManagementProvider,
} from './providers';

@Module({
  controllers: [ReviewsController],
  providers: [
    ReviewsService,
    ReviewManagementProvider,
    ReviewImageManagementProvider,
    ReviewRepository,
    ReviewImageRepository,
  ],
  exports: [ReviewsService],
})
export class ReviewsModule {}

import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { BlogModule } from '../blog/blog.module';

/**
 * PublicModule groups customer-facing and public business modules
 * These modules contain endpoints primarily used by customers
 * and public visitors:
 *
 * - Catalog: Product browsing, search, and discovery
 * - Reviews: Customer reviews and ratings
 * - Notifications: User notifications and preferences
 *
 * Note: Some endpoints may still require authentication
 * Access control is handled by guards in individual controllers.
 */
@Module({
  // imports: [CatalogModule, ReviewsModule, NotificationsModule, BlogModule],
  // exports: [CatalogModule, ReviewsModule, NotificationsModule,BlogModule],
})
export class PublicModule {}

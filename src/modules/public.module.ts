import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CartModule } from '../cart/cart.module';
import { OrdersModule } from '../orders/orders.module';

/**
 * PublicModule groups customer-facing / public store features
 * This includes:
 * - Catalog browsing (search & discover products from all vendors)
 * - Shopping cart
 * - Order placement & history
 * - Product reviews & ratings
 * - Notifications
 *
 * Used by: Customers browsing and buying from the marketplace
 * Route prefix: /api/v1/shop/* or /api/v1/catalog/*
 *
 * Note: Some endpoints require authentication (cart, orders)
 * Access control handled by guards in individual controllers.
 */
@Module({
  imports: [
    CatalogModule,        // Browse all products
    CartModule,           // Shopping cart
    OrdersModule,         // Place & view orders
    ReviewsModule,        // Product reviews
    NotificationsModule,  // User notifications
  ],
  exports: [
    CatalogModule,
    CartModule,
    OrdersModule,
    ReviewsModule,
    NotificationsModule,
  ],
})
export class PublicModule {}

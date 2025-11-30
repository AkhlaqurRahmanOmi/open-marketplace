import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { CartModule } from '../cart/cart.module';
import { InventoryModule } from '../inventory/inventory.module';
import { PaymentsModule } from '../payments/payments.module';
import { CouponsModule } from '../coupons/coupons.module';
import { ShippingModule } from '../shipping/shipping.module';
import { BundlesModule } from '../bundles/bundles.module';
import { ReportsModule } from '../reports/reports.module';
import { CmsModule } from '../cms/cms.module';

/**
 * AdminModule groups all admin-focused business modules
 * These modules contain endpoints primarily used by administrators
 * to manage the e-commerce platform:
 *
 * - Orders: Order management and fulfillment
 * - Cart: Cart administration and abandoned cart tracking
 * - Inventory: Stock management across locations
 * - Payments: Payment processing and reconciliation
 * - Coupons: Discount and promotion management
 * - Shipping: Shipping methods and rates
 * - Bundles: Product bundle management
 * - Reports: Analytics and business intelligence
 * - CMS: Content Management System for homepage sections
 *
 * Note: Access control is handled by guards (@Roles, @Permissions)
 * in individual controllers, not at the module level.
 */
@Module({
  // imports: [
  //   // Order Management
  //   OrdersModule,
  //   CartModule,
  //
  //   // Inventory & Products
  //   InventoryModule,
  //   BundlesModule,
  //
  //   // Payments & Discounts
  //   PaymentsModule,
  //   CouponsModule,
  //
  //   // Fulfillment
  //   ShippingModule,
  //
  //   // Analytics
  //   ReportsModule,
  //
  //   // Content Management
  //   CmsModule,
  // ],
  // exports: [
  //   OrdersModule,
  //   CartModule,
  //   InventoryModule,
  //   BundlesModule,
  //   PaymentsModule,
  //   CouponsModule,
  //   ShippingModule,
  //   ReportsModule,
  //   CmsModule,
  // ],
})
export class AdminModule {}

import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { CartModule } from '../cart/cart.module';
import { InventoryModule } from '../inventory/inventory.module';
import { PaymentsModule } from '../payments/payments.module';
import { CouponsModule } from '../coupons/coupons.module';
import { ShippingModule } from '../shipping/shipping.module';
import { BundlesModule } from '../bundles/bundles.module';
import { ReportsModule } from '../reports/reports.module';

/**
 * AdminModule groups admin operation modules (legacy)
 *
 * NOTE: This module is being replaced by more specific modules:
 * - PlatformModule: For super admin features
 * - VendorModule: For vendor dashboard features
 * - PublicModule: For customer-facing features
 *
 * Keeping this for backward compatibility during migration.
 *
 * Features:
 * - Order management across all vendors
 * - Cart administration
 * - Inventory management
 * - Payment processing
 * - Coupon management
 * - Shipping configuration
 * - Bundle management
 * - Analytics & reports
 *
 * Used by: Admin controllers with /admin/* routes
 */
@Module({
  imports: [
    OrdersModule,
    CartModule,
    InventoryModule,
    PaymentsModule,
    CouponsModule,
    ShippingModule,
    BundlesModule,
    ReportsModule,
  ],
  exports: [
    OrdersModule,
    CartModule,
    InventoryModule,
    PaymentsModule,
    CouponsModule,
    ShippingModule,
    BundlesModule,
    ReportsModule,
  ],
})
export class AdminModule {}

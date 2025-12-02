import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { InventoryModule } from '../inventory/inventory.module';
import { OrdersModule } from '../orders/orders.module';
import { CouponsModule } from '../coupons/coupons.module';
import { ShippingModule } from '../shipping/shipping.module';
import { BundlesModule } from '../bundles/bundles.module';

/**
 * VendorModule groups vendor dashboard features
 * This includes:
 * - Product management (create, update, delete own products)
 * - Inventory management (stock levels, locations)
 * - Order management (view & fulfill own orders)
 * - Coupon management (create own discounts)
 * - Shipping management (shipping methods & rates)
 * - Bundle management (product bundles)
 *
 * Used by: Vendor admins managing their own shop
 * Route prefix: /api/v1/vendor/*
 */
@Module({
  imports: [
    CatalogModule,    // Manage own products
    InventoryModule,  // Manage own inventory
    OrdersModule,     // View & fulfill own orders
    CouponsModule,    // Create own coupons
    ShippingModule,   // Manage shipping methods
    BundlesModule,    // Create product bundles
  ],
  exports: [
    CatalogModule,
    InventoryModule,
    OrdersModule,
    CouponsModule,
    ShippingModule,
    BundlesModule,
  ],
})
export class VendorModule {}

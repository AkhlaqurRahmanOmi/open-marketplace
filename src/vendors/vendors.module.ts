import { Module } from '@nestjs/common';
import { PrismaModule } from '../core/config/prisma/prisma.module';
import { ShippingModule } from '../shipping/shipping.module';
import { VendorBalanceRepository } from './repositories/vendor-balance.repository';
import { VendorBalanceManagementProvider } from './providers/vendor-balance-management.provider';
import { VendorsService } from './vendors.service';
import { VendorBalanceController } from './controllers/vendor-balance.controller';
import { PlatformVendorController } from './controllers/platform-vendor.controller';
import { VendorShipmentController } from './controllers/vendor-shipment.controller';

/**
 * VendorsModule handles vendor operations
 * - Balance tracking (available, pending, earnings)
 * - Transaction history
 * - Payout management
 * - Shipment management (Phase 8)
 *
 * Controllers:
 * - VendorBalanceController: Vendor-scoped endpoints for balance and payouts
 * - PlatformVendorController: Platform admin endpoints for vendor management
 * - VendorShipmentController: Vendor-scoped endpoints for shipment management
 *
 * Note: SharedModule is @Global() so UnitOfWorkService is already available
 */
@Module({
  imports: [PrismaModule, ShippingModule],
  controllers: [
    VendorBalanceController,
    PlatformVendorController,
    VendorShipmentController,
  ],
  providers: [
    VendorsService,
    VendorBalanceRepository,
    VendorBalanceManagementProvider,
  ],
  exports: [VendorsService, VendorBalanceManagementProvider],
})
export class VendorsModule {}

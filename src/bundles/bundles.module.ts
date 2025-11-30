import { Module } from '@nestjs/common';
import { BundlesController } from './bundles.controller';
import { BundlesService } from './bundles.service';
import { InventoryModule } from '../inventory/inventory.module';

// Repositories
import { BundleRepository, BundleItemRepository } from './repositories';

// Providers
import {
  BundleManagementProvider,
  BundleValidationProvider,
  BundlePricingProvider,
  BundleSuggestionProvider,
} from './providers';

@Module({
  imports: [
    InventoryModule, // Import to use InventoryService for stock validation
  ],
  controllers: [BundlesController],
  providers: [
    // Service facade
    BundlesService,

    // Repositories
    BundleRepository,
    BundleItemRepository,

    // Business logic providers
    BundleManagementProvider,
    BundleValidationProvider,
    BundlePricingProvider,
    BundleSuggestionProvider,
  ],
  exports: [
    BundlesService, // Export for OrdersModule and other modules
  ],
})
export class BundlesModule {}

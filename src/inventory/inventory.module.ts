import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import {
  LocationManagementProvider,
  InventoryManagementProvider,
  MovementTrackingProvider,
  StockAllocationProvider,
} from './providers';
import {
  LocationRepository,
  VariantInventoryRepository,
  InventoryMovementRepository,
} from './repositories';

@Module({
  controllers: [InventoryController],
  providers: [
    InventoryService,
    // Repositories
    LocationRepository,
    VariantInventoryRepository,
    InventoryMovementRepository,
    // Providers (exported for reusability in other modules)
    LocationManagementProvider,
    InventoryManagementProvider,
    MovementTrackingProvider,
    StockAllocationProvider,
  ],
  exports: [
    InventoryService,
    StockAllocationProvider, // Export for use in orders module
    InventoryManagementProvider, // Export for use in other modules
  ],
})
export class InventoryModule {}

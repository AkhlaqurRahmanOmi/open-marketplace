import { Module } from '@nestjs/common';
import { ShippingController } from './shipping.controller';
import { ShippingService } from './shipping.service';

// Repositories
import { ShippingMethodRepository } from './repositories';
import { ShipmentRepository } from './repositories/shipment.repository';

// Providers
import {
  ShippingManagementProvider,
  ShippingRateCalculatorProvider,
} from './providers';
import { ShipmentManagementProvider } from './providers/shipment-management.provider';

@Module({
  controllers: [ShippingController],
  providers: [
    // Service facade
    ShippingService,

    // Repositories
    ShippingMethodRepository,
    ShipmentRepository,

    // Business logic providers
    ShippingManagementProvider,
    ShippingRateCalculatorProvider,
    ShipmentManagementProvider,
  ],
  exports: [
    ShippingService, // Export for Cart and Orders modules
  ],
})
export class ShippingModule {}

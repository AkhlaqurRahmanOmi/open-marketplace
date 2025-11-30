import { Module } from '@nestjs/common';
import { ShippingController } from './shipping.controller';
import { ShippingService } from './shipping.service';

// Repositories
import { ShippingMethodRepository } from './repositories';

// Providers
import {
  ShippingManagementProvider,
  ShippingRateCalculatorProvider,
} from './providers';

@Module({
  controllers: [ShippingController],
  providers: [
    // Service facade
    ShippingService,

    // Repository
    ShippingMethodRepository,

    // Business logic providers
    ShippingManagementProvider,
    ShippingRateCalculatorProvider,
  ],
  exports: [
    ShippingService, // Export for Cart and Orders modules
  ],
})
export class ShippingModule {}

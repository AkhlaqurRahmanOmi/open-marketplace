import { Module, forwardRef } from '@nestjs/common';
import { CartController } from './cart.controller';
import { CartAdminController } from './cart-admin.controller';
import { CartService } from './cart.service';
import {
  CartInventoryProvider,
  CartManagementProvider,
  CartPricingProvider,
  CartReportsProvider,
} from './providers';
import { CartRepository, CartItemRepository } from './repositories';
import { PrismaModule } from '../core/config/prisma/prisma.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => InventoryModule), // Forward reference to avoid circular dependency
  ],
  controllers: [CartController, CartAdminController],
  providers: [
    CartService,
    // Repositories
    CartRepository,
    CartItemRepository,
    // Providers
    CartInventoryProvider,
    CartManagementProvider,
    CartPricingProvider,
    CartReportsProvider,
  ],
  exports: [CartService], // Export for other modules (Orders, Checkout)
})
export class CartModule {}

import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersAdminController } from './orders-admin.controller';
import { OrdersService } from './orders.service';
import { OrderManagementProvider } from './providers/order-management.provider';
import { OrderReportsProvider } from './providers/order-reports.provider';
import { CommissionCalculatorProvider } from './providers/commission-calculator.provider';
import { OrderRepository } from './repositories/order.repository';
import { InventoryModule } from '../inventory/inventory.module';
import { BundlesModule } from '../bundles/bundles.module';
import { ShippingModule } from '../shipping/shipping.module';
import { PrismaModule } from '../core/config/prisma/prisma.module';
import { VendorsModule } from '../vendors/vendors.module';

@Module({
  imports: [PrismaModule, InventoryModule, BundlesModule, ShippingModule, VendorsModule],
  controllers: [OrdersController, OrdersAdminController],
  providers: [
    OrdersService,
    OrderManagementProvider,
    OrderReportsProvider,
    CommissionCalculatorProvider,
    OrderRepository,
  ],
  exports: [OrdersService, CommissionCalculatorProvider],
})
export class OrdersModule {}

import { Module, forwardRef } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import {
  ProductManagementProvider,
  VariantManagementProvider,
  CategoryManagementProvider,
  ImageManagementProvider,
  OptionManagementProvider,
  WishlistManagementProvider,
} from './providers';
import {
  ProductRepository,
  VariantRepository,
  CategoryRepository, WishlistRepository,
} from './repositories';
import { SharedModule } from '../shared/shared.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [
    SharedModule,
    forwardRef(() => OrdersModule),
  ],
  controllers: [CatalogController],
  providers: [
    CatalogService,
    // Repositories
    ProductRepository,
    VariantRepository,
    CategoryRepository,
    WishlistRepository,
    // Providers (exported for reusability in other modules)
    ProductManagementProvider,
    VariantManagementProvider,
    CategoryManagementProvider,
    ImageManagementProvider,
    OptionManagementProvider,
    //wishlist provider
    WishlistManagementProvider
  ],
  exports: [
    CatalogService
  ],
})
export class CatalogModule {}

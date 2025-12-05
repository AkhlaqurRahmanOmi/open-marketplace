import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { Auth } from '../auth/decorator/auth.decorator';
import { AuthType } from '../auth/enums/auth-type.enum';
import { Permissions } from '../auth/decorator/permissions.decorator';
import { RelatedLinks } from '../shared/decorators/related-links.decorator';
import { CacheTTL } from '../shared/decorators/cache-ttl.decorator';

import { CatalogService } from './catalog.service';
import {
  AddToWishlistDto,
  CreateCategoryDto,
  CreateCompleteProductDto,
  CreateOptionValueDto,
  CreateProductDto,
  CreateProductImageDto,
  CreateProductOptionDto,
  CreateVariantDto,
  CreateVariantImageDto,
  ProductFilterDto,
  UpdateCategoryDto,
  UpdateProductDto,
  UpdateVariantDto,
} from './dtos';
import { ActiveUser } from '../auth/decorator/active-user.decorator';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  // ============ Public Product Endpoints ============

  @Get('products')
  @Auth(AuthType.None)
  // @UseInterceptors(CacheInterceptor)
  // @CacheTTL(300000)
  @HttpCode(HttpStatus.OK)
  @RelatedLinks({
    product: {
      path: '/api/v1/catalog/products/{id}',
      method: 'GET',
      rel: 'item',
      description: 'Get single product',
    },

  })
  getProducts(@Query() filterDto: ProductFilterDto) {
    return this.catalog.getProducts(filterDto);
  }

    // extra search endpoints
    @Get('products/search')
    @UseInterceptors(CacheInterceptor)
    @CacheTTL(600000)
    @Auth(AuthType.None)
    @HttpCode(HttpStatus.OK)
    searchProducts(
        @Query('search') query: string,
        @Query() filters: ProductFilterDto,
    ) {
        return this.catalog.searchProducts(query, filters);
    }

  @Get('products/:id')
  // @UseInterceptors(CacheInterceptor)
  // @CacheTTL(600000)
  @Auth(AuthType.None)
  @HttpCode(HttpStatus.OK)
  @RelatedLinks({
    self: {
      path: '/api/v1/catalog/products/{id}',
      method: 'GET',
      rel: 'self',
      description: 'Get this product',
    },
    variants: {
      path: '/api/v1/catalog/products/{id}/variants',
      method: 'GET',
      rel: 'related',
      description: 'Get product variants',
    },
    images: {
      path: '/api/v1/catalog/products/{id}/images',
      method: 'GET',
      rel: 'related',
      description: 'Get product images',
    },
    options: {
      path: '/api/v1/catalog/products/{id}/options',
      method: 'GET',
      rel: 'related',
      description: 'Get product options',
    },
  })
  getProductById(@Param('id', ParseIntPipe) id: number) {
    return this.catalog.getProductById(id);
  }

  @Get('products/:id/variants')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(600000)
  @Auth(AuthType.None)
  @HttpCode(HttpStatus.OK)
  @RelatedLinks({
    product: {
      path: '/api/v1/catalog/products/{id}',
      method: 'GET',
      rel: 'related',
      description: 'Get parent product',
    },
  })
  getProductVariants(@Param('id', ParseIntPipe) productId: number) {
    return this.catalog.getProductVariants(productId);
  }

  @Get('variants/:id')
  @Auth(AuthType.None)
  @HttpCode(HttpStatus.OK)
  @RelatedLinks({
    self: {
      path: '/api/v1/catalog/variants/{id}',
      method: 'GET',
      rel: 'self',
      description: 'Get this variant',
    },
    inventory: {
      path: '/api/v1/catalog/variants/{id}/inventory',
      method: 'GET',
      rel: 'related',
      description: 'Get variant inventory',
    },
  })
  getVariantById(@Param('id', ParseIntPipe) id: number) {
    return this.catalog.getVariantById(id);
  }

  @Get('variants/:id/inventory')
  @Auth(AuthType.None)
  @HttpCode(HttpStatus.OK)
  getVariantInventory(@Param('id', ParseIntPipe) variantId: number) {
    return this.catalog.getVariantInventory(variantId);
  }

  @Get('categories')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(600000)
  @Auth(AuthType.None)
  @HttpCode(HttpStatus.OK)
  @RelatedLinks({
    category: {
      path: '/api/v1/catalog/categories/{id}',
      method: 'GET',
      rel: 'item',
      description: 'Get single category',
    },
  })
  getCategories() {
    return this.catalog.getCategories();
  }

  @Get('categories/:id')
  @Auth(AuthType.None)
  @HttpCode(HttpStatus.OK)
  @RelatedLinks({
    self: {
      path: '/api/v1/catalog/categories/{id}',
      method: 'GET',
      rel: 'self',
      description: 'Get this category',
    },
    products: {
      path: '/api/v1/catalog/categories/{id}/products',
      method: 'GET',
      rel: 'related',
      description: 'Get category products',
    },
  })
  getCategoryById(@Param('id', ParseIntPipe) id: number) {
    return this.catalog.getCategoryById(id);
  }

  @Get('categories/:id/products')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(600000)
  @Auth(AuthType.None)
  @HttpCode(HttpStatus.OK)
  getCategoryProducts(@Param('id', ParseIntPipe) categoryId: number) {
    return this.catalog.getCategoryProducts(categoryId);
  }

  @Get('products/:id/images')
  @Auth(AuthType.None)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(30000)
  getProductImages(@Param('id', ParseIntPipe) productId: number) {
    return this.catalog.getProductImages(productId);
  }

  @Get('products/:id/options')
  @Auth(AuthType.None)
  @HttpCode(HttpStatus.OK)
  getProductOptions(@Param('id', ParseIntPipe) productId: number) {
    return this.catalog.getProductOptions(productId);
  }

  // ============ Admin Product Endpoints ============

  @Post('products')
  @Permissions('products:create')
  @HttpCode(HttpStatus.CREATED)
  @RelatedLinks({
    self: {
      path: '/api/v1/catalog/products/{id}',
      method: 'GET',
      rel: 'self',
      description: 'Get created product',
    },
    update: {
      path: '/api/v1/catalog/products/{id}',
      method: 'PATCH',
      rel: 'edit',
      description: 'Update product',
    },
    delete: {
      path: '/api/v1/catalog/products/{id}',
      method: 'DELETE',
      rel: 'delete',
      description: 'Delete product',
    },
  })
  createProduct(@Body() createProductDto: CreateProductDto) {
    return this.catalog.createProduct(createProductDto);
  }

  @Patch('products/:id')
  @Permissions('products:update')
  @HttpCode(HttpStatus.OK)
  @RelatedLinks({
    self: {
      path: '/api/v1/catalog/products/{id}',
      method: 'GET',
      rel: 'self',
      description: 'Get updated product',
    },
  })
  updateProduct(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.catalog.updateProduct(id, updateProductDto);
  }

  @Delete('products/:id')
  @Permissions('products:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteProduct(@Param('id', ParseIntPipe) id: number) {
    await this.catalog.deleteProduct(id);
  }

  @Post('products/:id/publish')
  @Permissions('products:update')
  @HttpCode(HttpStatus.OK)
  publishProduct(@Param('id', ParseIntPipe) id: number) {
    return this.catalog.publishProduct(id);
  }

  @Post('products/:id/unpublish')
  @Permissions('products:update')
  @HttpCode(HttpStatus.OK)
  unpublishProduct(@Param('id', ParseIntPipe) id: number) {
    return this.catalog.unpublishProduct(id);
  }

  // ============ Admin Variant Endpoints ============

  @Post('products/:id/variants')
  @Permissions('products:create')
  @HttpCode(HttpStatus.CREATED)
  @RelatedLinks({
    self: {
      path: '/api/v1/catalog/variants/{id}',
      method: 'GET',
      rel: 'self',
      description: 'Get created variant',
    },
    product: {
      path: '/api/v1/catalog/products/{id}',
      method: 'GET',
      rel: 'related',
      description: 'Get parent product',
    },
  })
  createVariant(
    @Param('id', ParseIntPipe) productId: number,
    @Body() createVariantDto: CreateVariantDto,
  ) {
    // Ensure controller authority over productId from route
    return this.catalog.createVariant({ ...createVariantDto, productId });
  }

  @Patch('variants/:id')
  @Permissions('products:update')
  @HttpCode(HttpStatus.OK)
  updateVariant(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateVariantDto: UpdateVariantDto,
  ) {
    return this.catalog.updateVariant(id, updateVariantDto);
  }

  @Delete('variants/:id')
  @Permissions('products:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteVariant(@Param('id', ParseIntPipe) id: number) {
    await this.catalog.deleteVariant(id);
  }

  // ============ Admin Category Endpoints ============

  @Post('categories')
  @Permissions('categories:create')
  @HttpCode(HttpStatus.CREATED)
  @RelatedLinks({
    self: {
      path: '/api/v1/catalog/categories/{id}',
      method: 'GET',
      rel: 'self',
      description: 'Get created category',
    },
    update: {
      path: '/api/v1/catalog/categories/{id}',
      method: 'PATCH',
      rel: 'edit',
      description: 'Update category',
    },
    delete: {
      path: '/api/v1/catalog/categories/{id}',
      method: 'DELETE',
      rel: 'delete',
      description: 'Delete category',
    },
  })
  createCategory(@Body() createCategoryDto: CreateCategoryDto) {
    return this.catalog.createCategory(createCategoryDto);
  }

  @Patch('categories/:id')
  @Permissions('categories:update')
  @HttpCode(HttpStatus.OK)
  updateCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.catalog.updateCategory(id, updateCategoryDto);
  }

  @Delete('categories/:id')
  @Permissions('categories:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCategory(@Param('id', ParseIntPipe) id: number) {
    await this.catalog.deleteCategory(id);
  }



  // ============ Admin Image Endpoints ============

  @Post('products/:id/images')
  @Permissions('products:create')
  @HttpCode(HttpStatus.CREATED)
  addProductImage(
    @Param('id', ParseIntPipe) productId: number,
    @Body() createImageDto: CreateProductImageDto,
  ) {
    return this.catalog.addProductImage({ ...createImageDto, productId });
  }

  @Delete('products/:productId/images/:imageId')
  @Permissions('products:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteProductImage(@Param('imageId', ParseIntPipe) imageId: number) {
    await this.catalog.deleteProductImage(imageId);
  }

  @Post('variants/:id/images')
  @Permissions('products:create')
  @HttpCode(HttpStatus.CREATED)
  addVariantImage(
    @Param('id', ParseIntPipe) variantId: number,
    @Body() createImageDto: CreateVariantImageDto,
  ) {
    return this.catalog.addVariantImage({ ...createImageDto, variantId });
  }

  @Delete('variants/:variantId/images/:imageId')
  @Permissions('products:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteVariantImage(@Param('imageId', ParseIntPipe) imageId: number) {
    await this.catalog.deleteVariantImage(imageId);
  }

  // ============ Admin Option Endpoints ============

  @Post('products/:id/options')
  @Permissions('products:create')
  @HttpCode(HttpStatus.CREATED)
  createProductOption(
    @Param('id', ParseIntPipe) productId: number,
    @Body() createOptionDto: CreateProductOptionDto,
  ) {
    return this.catalog.createProductOption({ ...createOptionDto, productId });
  }

  @Delete('options/:id')
  @Permissions('products:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteProductOption(@Param('id', ParseIntPipe) optionId: number) {
    await this.catalog.deleteProductOption(optionId);
  }

  @Post('options/:id/values')
  @Permissions('products:create')
  @HttpCode(HttpStatus.CREATED)
  createOptionValue(
    @Param('id', ParseIntPipe) optionId: number,
    @Body() createValueDto: CreateOptionValueDto,
  ) {
    return this.catalog.createOptionValue({ ...createValueDto, optionId });
  }

  @Post('products/complete')
  @Permissions('products:create')
  @HttpCode(HttpStatus.CREATED)
  createCompleteProduct(@Body() data: CreateCompleteProductDto) {
    return this.catalog.createCompleteProduct(data);
  }


  @Delete('option-values/:id')
  @Permissions('products:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteOptionValue(@Param('id', ParseIntPipe) valueId: number) {
    await this.catalog.deleteOptionValue(valueId);
  }

  /*
  * wishlist endpoints
  * */

  @Get('wishlists/me')
  @Auth(AuthType.Bearer)
  getMyWishlist(@ActiveUser('sub') userId: number) {
    return this.catalog.getMyWishList(userId)
  }

  @Get('wishlists/me/count')
  @Auth(AuthType.Bearer)
  getMyWishlistCount(@ActiveUser('sub') userId: number) {
    return this.catalog.getMyWishlistCount(userId)
  }

  @Post('wishlists/items')
  @Auth(AuthType.Bearer)
  addItemToMyWishlist(@ActiveUser('sub') userId: number, @Body() dto: AddToWishlistDto) {
    return this.catalog.addItemToMyWishlist(userId, dto)
  }

  @Delete('wishlists/items/:id')
  @Auth(AuthType.Bearer)
  removeItemFromMyWishlist(@ActiveUser('sub') userId: number, @Param('id', ParseIntPipe) id: number) {
    return this.catalog.removeItemFromMyWishlist(userId, id)
  }

  @Delete('wishlist/clear')
  @Auth(AuthType.Bearer)
  clearMyWishlist(@ActiveUser('sub') userId: number) {
    return this.catalog.clearMyWishlist(userId)
  }

  // ============ Commission Management Endpoints ============

  @Get('products/:id/commission')
  @Auth(AuthType.None)
  @HttpCode(HttpStatus.OK)
  @RelatedLinks({
    self: {
      path: '/api/v1/catalog/products/{id}/commission',
      method: 'GET',
      rel: 'self',
      description: 'Get product commission breakdown',
    },
    product: {
      path: '/api/v1/catalog/products/{id}',
      method: 'GET',
      rel: 'related',
      description: 'Get product details',
    },
  })
  async getProductCommission(@Param('id', ParseIntPipe) id: number) {
    return this.catalog.getProductCommissionBreakdown(id);
  }

  @Get('categories/:id/commission')
  @Auth(AuthType.None)
  @HttpCode(HttpStatus.OK)
  @RelatedLinks({
    self: {
      path: '/api/v1/catalog/categories/{id}/commission',
      method: 'GET',
      rel: 'self',
      description: 'Get category commission breakdown',
    },
    category: {
      path: '/api/v1/catalog/categories/{id}',
      method: 'GET',
      rel: 'related',
      description: 'Get category details',
    },
  })
  async getCategoryCommission(@Param('id', ParseIntPipe) id: number) {
    return this.catalog.getCategoryCommissionBreakdown(id);
  }
}

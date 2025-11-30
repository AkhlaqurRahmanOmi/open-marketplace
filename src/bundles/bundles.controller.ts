import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseInterceptors,
} from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { Auth } from '../auth/decorator/auth.decorator';
import { AuthType } from '../auth/enums/auth-type.enum';
import { Roles } from '../auth/decorator/roles.decorator';
import { Permissions } from '../auth/decorator/permissions.decorator';
import { RelatedLinks } from '../shared/decorators/related-links.decorator';
import { CacheTTL } from '../shared/decorators/cache-ttl.decorator';
import { BundlesService } from './bundles.service';
import {
  CreateBundleDto,
  UpdateBundleDto,
  BundleFilterDto,
  AddBundleItemDto,
} from './dtos';

@Controller('bundles')
export class BundlesController {
  constructor(private readonly bundlesService: BundlesService) {}

  // ============ Public Bundle Endpoints ============

  @Get()
  @Auth(AuthType.None)
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300000) // 5 minutes
  @HttpCode(HttpStatus.OK)
  @RelatedLinks({
    bundle: {
      path: '/api/v1/bundles/{id}',
      method: 'GET',
      rel: 'item',
      description: 'Get single bundle',
    },
  })
  getAllBundles(@Query() filterDto: BundleFilterDto) {
    return this.bundlesService.getAllBundles(filterDto);
  }

  @Get('active')
  @Auth(AuthType.None)
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300000)
  @HttpCode(HttpStatus.OK)
  getActiveBundles() {
    return this.bundlesService.getActiveBundles();
  }

  @Get(':id')
  @Auth(AuthType.None)
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(600000) // 10 minutes
  @HttpCode(HttpStatus.OK)
  @RelatedLinks({
    self: {
      path: '/api/v1/bundles/{id}',
      method: 'GET',
      rel: 'self',
      description: 'Current bundle',
    },
    availability: {
      path: '/api/v1/bundles/{id}/availability',
      method: 'GET',
      rel: 'related',
      description: 'Check bundle availability',
    },
    pricing: {
      path: '/api/v1/bundles/{id}/pricing',
      method: 'GET',
      rel: 'related',
      description: 'Get bundle pricing details',
    },
  })
  getBundleById(@Param('id', ParseIntPipe) id: number) {
    return this.bundlesService.getBundleById(id);
  }

  @Get(':id/availability')
  @Auth(AuthType.None)
  @HttpCode(HttpStatus.OK)
  checkBundleAvailability(
    @Param('id', ParseIntPipe) id: number,
    @Query('quantity', ParseIntPipe) quantity: number = 1,
  ) {
    return this.bundlesService.checkBundleAvailability(id, quantity);
  }

  @Get(':id/pricing')
  @Auth(AuthType.None)
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300000)
  @HttpCode(HttpStatus.OK)
  getBundlePricing(@Param('id', ParseIntPipe) id: number) {
    return this.bundlesService.calculateBundlePricing(id);
  }

  // ============ Bundle Suggestion Endpoints ============

  @Get('suggestions/variant/:variantId')
  @Auth(AuthType.None)
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300000)
  @HttpCode(HttpStatus.OK)
  getSuggestionsForVariant(
    @Param('variantId', ParseIntPipe) variantId: number,
    @Query('limit', ParseIntPipe) limit: number = 3,
  ) {
    return this.bundlesService.getTopSuggestionsForVariant(variantId, limit);
  }

  @Post('suggestions/batch')
  @Auth(AuthType.None)
  @HttpCode(HttpStatus.OK)
  getSuggestionsForVariants(
    @Body('variantIds') variantIds: number[],
    @Body('limit') limit: number = 5,
  ) {
    return this.bundlesService.getTopSuggestionsForVariants(variantIds, limit);
  }

  @Post('suggestions/cart')
  @Auth(AuthType.None)
  @HttpCode(HttpStatus.OK)
  getCartBasedRecommendations(
    @Body('variantIds') variantIds: number[],
    @Body('limit') limit: number = 3,
  ) {
    return this.bundlesService.getCartBasedRecommendations(variantIds, limit);
  }

  @Get('sorted/savings')
  @Auth(AuthType.None)
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(600000)
  @HttpCode(HttpStatus.OK)
  getBundlesSortedBySavings() {
    return this.bundlesService.getBundlesSortedBySavings();
  }

  @Get('sorted/savings-percent')
  @Auth(AuthType.None)
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(600000)
  @HttpCode(HttpStatus.OK)
  getBundlesSortedBySavingsPercent() {
    return this.bundlesService.getBundlesSortedBySavingsPercent();
  }

  // ============ Admin Bundle Management Endpoints ============

  @Post()
  @Permissions('bundles:create')
  @HttpCode(HttpStatus.CREATED)
  @RelatedLinks({
    self: {
      path: '/api/v1/bundles/{id}',
      method: 'GET',
      rel: 'self',
      description: 'View created bundle',
    },
  })
  createBundle(@Body() createBundleDto: CreateBundleDto) {
    return this.bundlesService.createBundle(createBundleDto);
  }

  @Patch(':id')
  @Permissions('bundles:update')
  @HttpCode(HttpStatus.OK)
  updateBundle(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBundleDto: UpdateBundleDto,
  ) {
    return this.bundlesService.updateBundle(id, updateBundleDto);
  }

  @Delete(':id')
  @Permissions('bundles:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteBundle(@Param('id', ParseIntPipe) id: number) {
    return this.bundlesService.deleteBundle(id);
  }

  @Post(':id/items')
  @Permissions('bundles:create')
  @HttpCode(HttpStatus.CREATED)
  addItemToBundle(
    @Param('id', ParseIntPipe) id: number,
    @Body() addItemDto: AddBundleItemDto,
  ) {
    return this.bundlesService.addItemToBundle(
      id,
      addItemDto.variantId,
      addItemDto.quantity,
    );
  }

  @Delete(':id/items/:itemId')
  @Permissions('bundles:delete')
  @HttpCode(HttpStatus.OK)
  removeItemFromBundle(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
  ) {
    return this.bundlesService.removeItemFromBundle(id, itemId);
  }
}

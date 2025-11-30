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
import { Auth } from '../auth/decorator/auth.decorator';
import { AuthType } from '../auth/enums/auth-type.enum';
import { Roles } from '../auth/decorator/roles.decorator';
import { Permissions } from '../auth/decorator/permissions.decorator';
import { RelatedLinks } from '../shared/decorators/related-links.decorator';
import { InventoryService } from './inventory.service';
import {
  CreateLocationDto,
  UpdateLocationDto,
  AdjustInventoryDto,
  TransferInventoryDto,
  ReserveInventoryDto,
  ReleaseInventoryDto,
  MovementFilterDto,
  InventoryFilterDto,
} from './dtos';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { CacheTTL } from '../shared/decorators/cache-ttl.decorator';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  // ============ Public Inventory Endpoints ============

  @Get('variants/:variantId/availability')
  @Auth(AuthType.None)
  @HttpCode(HttpStatus.OK)
  @RelatedLinks({
    inventory: {
      path: '/api/v1/inventory/variants/{variantId}',
      method: 'GET',
      rel: 'related',
      description: 'Get full inventory details',
    },
  })
  async checkAvailability(
    @Param('variantId', ParseIntPipe) variantId: number,
    @Query('locationId', ParseIntPipe) locationId: number,
    @Query('quantity', ParseIntPipe) quantity: number,
  ) {
    const isAvailable = await this.inventory.checkAvailability(
      variantId,
      locationId,
      quantity,
    );
    return {
      variantId,
      locationId,
      quantity,
      available: isAvailable,
    };
  }

  @Get('variants/:variantId')
  @Auth(AuthType.None)
  @HttpCode(HttpStatus.OK)
  @RelatedLinks({
    self: {
      path: '/api/v1/inventory/variants/{variantId}',
      method: 'GET',
      rel: 'self',
      description: 'Get variant inventory',
    },
  })
  getVariantInventory(@Param('variantId', ParseIntPipe) variantId: number) {
    return this.inventory.getInventoryByVariant(variantId);
  }

  @Get('variants/:variantId/total')
  @Auth(AuthType.None)
  @HttpCode(HttpStatus.OK)
  async getVariantTotalQuantity(@Param('variantId', ParseIntPipe) variantId: number) {
    const [total, available] = await Promise.all([
      this.inventory.getTotalQuantity(variantId),
      this.inventory.getTotalAvailableQuantity(variantId),
    ]);

    return {
      variantId,
      totalQuantity: total,
      availableQuantity: available,
      reservedQuantity: total - available,
    };
  }

  @Get('locations')
  @Auth(AuthType.None)
  @HttpCode(HttpStatus.OK)
  @RelatedLinks({
    location: {
      path: '/api/v1/inventory/locations/{id}',
      method: 'GET',
      rel: 'item',
      description: 'Get single location',
    },
  })
  getAllLocations() {
    return this.inventory.getAllLocations();
  }

  @Get('locations/:id')
  @Auth(AuthType.None)
  @HttpCode(HttpStatus.OK)
  @RelatedLinks({
    self: {
      path: '/api/v1/inventory/locations/{id}',
      method: 'GET',
      rel: 'self',
      description: 'Get this location',
    },
    inventory: {
      path: '/api/v1/inventory/locations/{id}/inventory',
      method: 'GET',
      rel: 'related',
      description: 'Get location inventory',
    },
  })
  getLocationById(@Param('id', ParseIntPipe) id: number) {
    return this.inventory.getLocationById(id);
  }

  @Get('locations/:id/inventory')
  @Auth(AuthType.None)
  @HttpCode(HttpStatus.OK)
  getLocationInventory(@Param('id', ParseIntPipe) locationId: number) {
    return this.inventory.getInventoryByLocation(locationId);
  }

  // ============ Admin Location Endpoints ============

  @Post('locations')
  @Permissions('inventory:create')
  @HttpCode(HttpStatus.CREATED)
  @RelatedLinks({
    self: {
      path: '/api/v1/inventory/locations/{id}',
      method: 'GET',
      rel: 'self',
      description: 'Get created location',
    },
    update: {
      path: '/api/v1/inventory/locations/{id}',
      method: 'PATCH',
      rel: 'edit',
      description: 'Update location',
    },
    delete: {
      path: '/api/v1/inventory/locations/{id}',
      method: 'DELETE',
      rel: 'delete',
      description: 'Delete location',
    },
  })
  createLocation(@Body() createLocationDto: CreateLocationDto) {
    return this.inventory.createLocation(createLocationDto);
  }

  @Patch('locations/:id')
  @Permissions('inventory:update')
  @HttpCode(HttpStatus.OK)
  @RelatedLinks({
    self: {
      path: '/api/v1/inventory/locations/{id}',
      method: 'GET',
      rel: 'self',
      description: 'Get updated location',
    },
  })
  updateLocation(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateLocationDto: UpdateLocationDto,
  ) {
    return this.inventory.updateLocation(id, updateLocationDto);
  }

  @Delete('locations/:id')
  @Permissions('inventory:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteLocation(@Param('id', ParseIntPipe) id: number) {
    await this.inventory.deleteLocation(id);
  }

  // ============ Admin Inventory Management Endpoints ============

  @Get('all')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60000)
  @Permissions('inventory:view')
  @HttpCode(HttpStatus.OK)
  @RelatedLinks({
    lowStock: {
      path: '/api/v1/inventory/low-stock',
      method: 'GET',
      rel: 'related',
      description: 'Get low stock items',
    },
  })
  getAllInventory(@Query() filterDto: InventoryFilterDto) {
    return this.inventory.getAllInventory(filterDto);
  }

  @Get('low-stock')
  @Permissions('inventory:view')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60000)
  getLowStockItems(@Query('threshold', ParseIntPipe) threshold?: number) {
    return this.inventory.getLowStockItems(threshold);
  }

  @Post('adjust')
  @Permissions('inventory:adjust')
  @HttpCode(HttpStatus.OK)
  @RelatedLinks({
    variant: {
      path: '/api/v1/inventory/variants/{variantId}',
      method: 'GET',
      rel: 'related',
      description: 'Get variant inventory',
    },
    movements: {
      path: '/api/v1/inventory/movements?variantId={variantId}',
      method: 'GET',
      rel: 'related',
      description: 'Get movement history',
    },
  })
  adjustInventory(@Body() adjustInventoryDto: AdjustInventoryDto) {
    return this.inventory.adjustInventory(adjustInventoryDto);
  }

  @Post('transfer')
  @Permissions('inventory:transfer')
  @HttpCode(HttpStatus.OK)
  @RelatedLinks({
    from: {
      path: '/api/v1/inventory/locations/{fromLocationId}/inventory',
      method: 'GET',
      rel: 'related',
      description: 'Get source location inventory',
    },
    to: {
      path: '/api/v1/inventory/locations/{toLocationId}/inventory',
      method: 'GET',
      rel: 'related',
      description: 'Get destination location inventory',
    },
  })
  transferInventory(@Body() transferInventoryDto: TransferInventoryDto) {
    return this.inventory.transferInventory(transferInventoryDto);
  }

  // ============ Admin Stock Reservation Endpoints ============

  @Post('reserve')
  @Permissions('inventory:update')
  @HttpCode(HttpStatus.OK)
  reserveStock(@Body() reserveInventoryDto: ReserveInventoryDto) {
    return this.inventory.reserveStock(reserveInventoryDto);
  }

  @Post('release')
  @Permissions('inventory:update')
  @HttpCode(HttpStatus.OK)
  releaseStock(@Body() releaseInventoryDto: ReleaseInventoryDto) {
    return this.inventory.releaseStock(releaseInventoryDto);
  }

  @Post('fulfill')
  @Permissions('inventory:update')
  @HttpCode(HttpStatus.OK)
  async fulfillReservedStock(
    @Body()
    body: {
      variantId: number;
      locationId: number;
      quantity: number;
      orderId?: number;
    },
  ) {
    return this.inventory.fulfillReservedStock(
      body.variantId,
      body.locationId,
      body.quantity,
      body.orderId,
    );
  }

  @Get('variants/:variantId/best-location')
  @Permissions('inventory:view')
  @HttpCode(HttpStatus.OK)
  async findBestLocation(
    @Param('variantId', ParseIntPipe) variantId: number,
    @Query('quantity', ParseIntPipe) quantity: number,
  ) {
    const locationId = await this.inventory.findBestLocationForFulfillment(
      variantId,
      quantity,
    );

    return {
      variantId,
      quantity,
      recommendedLocationId: locationId,
    };
  }

  // ============ Admin Movement Tracking Endpoints ============

  @Get('movements')
  @Permissions('inventory:view')
  @HttpCode(HttpStatus.OK)
  @RelatedLinks({
    variant: {
      path: '/api/v1/inventory/movements?variantId={variantId}',
      method: 'GET',
      rel: 'related',
      description: 'Filter by variant',
    },
    location: {
      path: '/api/v1/inventory/movements?locationId={locationId}',
      method: 'GET',
      rel: 'related',
      description: 'Filter by location',
    },
  })
  getMovements(@Query() filterDto: MovementFilterDto) {
    return this.inventory.getMovementsWithFilters(filterDto);
  }

  @Get('variants/:variantId/movements')
  @Permissions('inventory:view')
  @HttpCode(HttpStatus.OK)
  getVariantMovements(@Param('variantId', ParseIntPipe) variantId: number) {
    return this.inventory.getMovementsByVariant(variantId);
  }

  @Get('locations/:locationId/movements')
  @Permissions('inventory:view')
  @HttpCode(HttpStatus.OK)
  getLocationMovements(@Param('locationId', ParseIntPipe) locationId: number) {
    return this.inventory.getMovementsByLocation(locationId);
  }

  @Get('orders/:orderId/movements')
  @Auth(AuthType.None)
  @HttpCode(HttpStatus.OK)
  getOrderMovements(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.inventory.getMovementsByOrder(orderId);
  }
}

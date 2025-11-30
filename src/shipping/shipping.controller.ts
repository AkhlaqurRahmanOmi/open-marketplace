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
} from '@nestjs/common';
import { ShippingService } from './shipping.service';
import {
  CalculateShippingDto,
  CreateShippingMethodDto,
  ShippingFilterDto,
  UpdateShippingMethodDto,
} from './dtos';
import { Roles } from '../auth/decorator/roles.decorator';
import { Permissions } from '../auth/decorator/permissions.decorator';
import { Auth } from '../auth/decorator/auth.decorator';
import { AuthType } from '../auth/enums/auth-type.enum';

// import { Public } from '../auth/decorator/public.decorator';

@Controller('shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  // ============================================
  // PUBLIC ENDPOINTS (No authentication required)
  // ============================================

  /**
   * Get all active shipping methods
   * GET /api/shipping/active
   */
  @Get('active')
  @Auth(AuthType.None)
  async getActiveShippingMethods() {
    return this.shippingService.getActiveShippingMethods();
  }

  /**
   * Calculate shipping rates for all methods
   * POST /api/shipping/calculate-all
   */
  @Post('calculate-all')
  @Auth(AuthType.None)
  async calculateAllRates(@Body() body: { subtotal: number; weight?: number }) {
    return this.shippingService.calculateAllRates(body.subtotal, body.weight);
  }

  /**
   * Calculate rate for specific shipping method
   * POST /api/shipping/calculate
   */
  @Post('calculate')
  @Auth(AuthType.None)
  async calculateRate(@Body() dto: CalculateShippingDto) {
    return this.shippingService.calculateRate(dto);
  }

  /**
   * Get cheapest shipping option
   * POST /api/shipping/cheapest
   */
  @Post('cheapest')
  @Auth(AuthType.None)
  async getCheapestOption(@Body() body: { subtotal: number; weight?: number }) {
    return this.shippingService.getCheapestOption(body.subtotal, body.weight);
  }

  /**
   * Get fastest shipping option
   * POST /api/shipping/fastest
   */
  @Post('fastest')
  @Auth(AuthType.None)
  async getFastestOption(@Body() body: { subtotal: number; weight?: number }) {
    return this.shippingService.getFastestOption(body.subtotal, body.weight);
  }

  // ============================================
  // ADMIN ENDPOINTS (Require ADMIN role)
  // ============================================

  /**
   * Get all shipping methods (with pagination & filters)
   * GET /api/shipping
   */
  @Get()
  @Permissions('shipping:view')
  async getAllShippingMethods(@Query() filterDto: ShippingFilterDto) {
    return this.shippingService.getAllShippingMethods(filterDto);
  }

  /**
   * Get shipping method by ID
   * GET /api/shipping/:id
   */
  @Get(':id')
  @Permissions('shipping:view')
  async getShippingMethodById(@Param('id', ParseIntPipe) id: number) {
    return this.shippingService.getShippingMethodById(id);
  }

  /**
   * Create new shipping method
   * POST /api/shipping
   */
  @Post()
  @Permissions('shipping:create')
  async createShippingMethod(@Body() dto: CreateShippingMethodDto) {
    return this.shippingService.createShippingMethod(dto);
  }

  /**
   * Update shipping method
   * PATCH /api/shipping/:id
   */
  @Patch(':id')
  @Permissions('shipping:update')
  async updateShippingMethod(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateShippingMethodDto,
  ) {
    return this.shippingService.updateShippingMethod(id, dto);
  }

  /**
   * Delete shipping method
   * DELETE /api/shipping/:id
   */
  @Delete(':id')
  @Permissions('shipping:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteShippingMethod(@Param('id', ParseIntPipe) id: number) {
    await this.shippingService.deleteShippingMethod(id);
  }

  /**
   * Toggle active status
   * PATCH /api/shipping/:id/toggle
   */
  @Patch(':id/toggle')
  @Permissions('shipping:update')
  async toggleActive(@Param('id', ParseIntPipe) id: number) {
    return this.shippingService.toggleActive(id);
  }
}

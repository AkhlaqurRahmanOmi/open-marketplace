import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { CartFilterDto } from './dtos';
import { Auth } from '../auth/decorator/auth.decorator';
import { AuthType } from '../auth/enums/auth-type.enum';
import { Roles } from '../auth/decorator/roles.decorator';
import { Permissions } from '../auth/decorator/permissions.decorator';
import { ReportFilterDto } from '../reports/dtos';

/**
 * Admin Controller for Cart Management
 * All endpoints require admin role and appropriate permissions
 * Route prefix: /admin/carts
 */
@Controller('admin/carts')
@Auth(AuthType.Bearer)
export class CartAdminController {
  constructor(private readonly cartService: CartService) {}

  // ============ Cart Management ============

  /**
   * Get all carts with filters (admin only)
   * Supports pagination, status filtering, etc.
   */
  @Get()
  @Permissions('carts:read')
  @HttpCode(HttpStatus.OK)
  async getAllCarts(@Query() filterDto: CartFilterDto) {
    return this.cartService.getAllCarts(filterDto);
  }

  /**
   * Get abandoned carts for follow-up
   * Retrieve carts that haven't been updated in specified days
   */
  @Get('abandoned')
  @Permissions('carts:read')
  @HttpCode(HttpStatus.OK)
  async getAbandonedCarts(@Query('days') days?: string) {
    const daysParam = days ? parseInt(days) : 1;
    return this.cartService.getAbandonedCartsForReminders(daysParam);
  }

  /**
   * Get cart count with optional status filter
   */
  @Get('count')
  @Permissions('carts:read')
  @HttpCode(HttpStatus.OK)
  async getCartCount(@Query('status') status?: string) {
    return this.cartService.getCartCount(status ? { status } : undefined);
  }

  /**
   * Mark carts as abandoned (batch operation)
   * Marks carts that haven't been updated in X hours as abandoned
   */
  @Post('mark-abandoned')
  @Permissions('carts:update')
  @HttpCode(HttpStatus.OK)
  async markAbandonedCarts() {
    const count = await this.cartService.markAbandonedCarts();
    return {
      message: `Marked ${count} carts as abandoned`,
      count,
    };
  }

  /**
   * Mark carts as expired (batch operation)
   * Marks carts that haven't been updated in X days as expired
   */
  @Post('mark-expired')
  @Permissions('carts:update')
  @HttpCode(HttpStatus.OK)
  async markExpiredCarts() {
    const count = await this.cartService.markExpiredCarts();
    return {
      message: `Marked ${count} carts as expired`,
      count,
    };
  }

  /**
   * Cleanup expired carts (batch operation)
   * Permanently deletes carts marked as expired
   */
  @Delete('cleanup-expired')
  @Permissions('carts:delete')
  @HttpCode(HttpStatus.OK)
  async cleanupExpiredCarts() {
    const count = await this.cartService.cleanupExpiredCarts();
    return {
      message: `Deleted ${count} expired carts`,
      count,
    };
  }

  // ============ Cart Reports ============

  /**
   * GET /admin/carts/reports/statistics
   * Get cart conversion and abandonment statistics
   */
  @Get('reports/statistics')
  @Permissions('reports:read')
  @HttpCode(HttpStatus.OK)
  async getCartStatistics(@Query() filterDto: ReportFilterDto) {
    const { startDate, endDate } = filterDto.getDateRange();
    return this.cartService.getCartStatistics(startDate, endDate);
  }

  /**
   * GET /admin/carts/reports/abandoned-details
   * Get detailed abandoned cart information
   */
  @Get('reports/abandoned-details')
  @Permissions('reports:read')
  @HttpCode(HttpStatus.OK)
  async getAbandonedCartDetails(
    @Query() filterDto: ReportFilterDto,
    @Query('limit') limit?: string,
  ) {
    const { startDate, endDate } = filterDto.getDateRange();
    return this.cartService.getAbandonedCartDetails(
      startDate,
      endDate,
      limit ? parseInt(limit) : 50,
    );
  }

  /**
   * GET /admin/carts/reports/average-value
   * Get average cart value
   */
  @Get('reports/average-value')
  @Permissions('reports:read')
  @HttpCode(HttpStatus.OK)
  async getAverageCartValue(@Query() filterDto: ReportFilterDto) {
    const { startDate, endDate } = filterDto.getDateRange();
    return this.cartService.getAverageCartValue(startDate, endDate);
  }

  /**
   * GET /admin/carts/reports/overview
   * Get comprehensive cart report with all metrics
   */
  @Get('reports/overview')
  @Permissions('reports:read')
  @HttpCode(HttpStatus.OK)
  async getCartReport(@Query() filterDto: ReportFilterDto) {
    const { startDate, endDate } = filterDto.getDateRange();
    return this.cartService.getCartReport(startDate, endDate);
  }
}

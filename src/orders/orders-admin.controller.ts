import {
  Controller,
  Get,
  Patch,
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
import { OrdersService } from './orders.service';
import {
  UpdateOrderStatusDto,
  OrderFilterDto,
} from './dtos';
import { ReportFilterDto } from '../reports/dtos';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { CacheTTL } from '../shared/decorators/cache-ttl.decorator';

/**
 * Admin Controller for Order Management
 * All endpoints require admin role and appropriate permissions
 * Route prefix: /admin/orders
 */
@Controller('admin/orders')
@Auth(AuthType.Bearer)
export class OrdersAdminController {
  constructor(private readonly ordersService: OrdersService) {}

  // ============ Order Management ============

  /**
   * Get all orders with filtering (admin view)
   * Supports pagination, status filtering, date range, etc.
   */
  @Get()
  @Permissions('orders:view')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60000)
  @HttpCode(HttpStatus.OK)
  getAllOrders(@Query() filterDto: OrderFilterDto) {
    return this.ordersService.getOrders(filterDto);
  }

  /**
   * Get order by ID (admin can access any order)
   */
  @Get(':id')
  @Permissions('orders:view')
  @HttpCode(HttpStatus.OK)
  getOrderById(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.getOrderById(id);
  }

  /**
   * Update order status (admin only)
   * Used for processing orders, marking shipped, delivered, etc.
   */
  @Patch(':id/status')
  @Permissions('orders:update')
  @HttpCode(HttpStatus.OK)
  updateOrderStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateOrderStatus(id, updateStatusDto);
  }

  // ============ Order Reports ============

  /**
   * GET /admin/orders/reports/sales-overview
   * Get comprehensive sales overview with aggregations
   */
  @Get('reports/sales-overview')
  @Permissions('reports:view')
  @HttpCode(HttpStatus.OK)
  async getSalesOverview(@Query() filterDto: ReportFilterDto) {
    const { startDate, endDate } = filterDto.getDateRange();
    return this.ordersService.getSalesOverview(startDate, endDate);
  }

  /**
   * GET /admin/orders/reports/top-customers
   * Get top customers by revenue
   */
  @Get('reports/top-customers')
  @Permissions('reports:view')
  @HttpCode(HttpStatus.OK)
  async getTopCustomers(
    @Query() filterDto: ReportFilterDto,
    @Query('limit') limit?: string,
  ) {
    const { startDate, endDate } = filterDto.getDateRange();
    return this.ordersService.getTopCustomers(
      startDate,
      endDate,
      limit ? parseInt(limit) : 10,
    );
  }

  /**
   * GET /admin/orders/reports/best-selling-products
   * Get best selling products by quantity and revenue
   */
  @Get('reports/best-selling-products')
  @Permissions('reports:view')
  @HttpCode(HttpStatus.OK)
  async getBestSellingProducts(
    @Query() filterDto: ReportFilterDto,
    @Query('limit') limit?: string,
  ) {
    const { startDate, endDate } = filterDto.getDateRange();
    return this.ordersService.getBestSellingProducts(
      startDate,
      endDate,
      limit ? parseInt(limit) : 10,
    );
  }

  /**
   * GET /admin/orders/reports/revenue-by-category
   * Get revenue breakdown by product category
   */
  @Get('reports/revenue-by-category')
  @Permissions('reports:view')
  @HttpCode(HttpStatus.OK)
  async getRevenueByCategory(@Query() filterDto: ReportFilterDto) {
    const { startDate, endDate } = filterDto.getDateRange();
    return this.ordersService.getRevenueByCategory(startDate, endDate);
  }

  /**
   * GET /admin/orders/reports/aov-trends
   * Get average order value trends over time
   */
  @Get('reports/aov-trends')
  @Permissions('reports:view')
  @HttpCode(HttpStatus.OK)
  async getAOVTrends(@Query() filterDto: ReportFilterDto) {
    const { startDate, endDate } = filterDto.getDateRange();
    return this.ordersService.getAOVTrends(startDate, endDate);
  }

  /**
   * GET /admin/orders/reports/status-breakdown
   * Get order status distribution
   */
  @Get('reports/status-breakdown')
  @Permissions('reports:view')
  @HttpCode(HttpStatus.OK)
  async getOrderStatusReport(@Query() filterDto: ReportFilterDto) {
    const { startDate, endDate } = filterDto.getDateRange();
    return this.ordersService.getOrderStatusReport(startDate, endDate);
  }
}

import { Controller, Get, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportFilterDto } from './dtos';
import { Auth } from '../auth/decorator/auth.decorator';
import { AuthType } from '../auth/enums/auth-type.enum';
import { Roles } from '../auth/decorator/roles.decorator';
import { Permissions } from '../auth/decorator/permissions.decorator';

/**
 * Admin Controller for Reports
 * All endpoints require admin role and reports:read permission
 * Route prefix: /admin/reports
 */
@Controller('admin/reports')
@Auth(AuthType.Bearer)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // ========== Sales & Order Reports ==========

  /**
   * GET /admin/reports/sales/overview
   * Get comprehensive sales overview
   */
  @Get('sales/overview')
  @Permissions('reports:read')
  @HttpCode(HttpStatus.OK)
  async getSalesOverview(@Query() filterDto: ReportFilterDto) {
    const { startDate, endDate } = filterDto.getDateRange();
    return this.reportsService.getSalesOverview(startDate, endDate);
  }

  /**
   * GET /admin/reports/sales/top-customers
   * Get top customers by revenue
   */
  @Get('sales/top-customers')
  @Permissions('reports:read')
  @HttpCode(HttpStatus.OK)
  async getTopCustomers(
    @Query() filterDto: ReportFilterDto,
    @Query('limit') limit?: string,
  ) {
    const { startDate, endDate } = filterDto.getDateRange();
    return this.reportsService.getTopCustomers(
      startDate,
      endDate,
      limit ? parseInt(limit) : undefined,
    );
  }

  /**
   * GET /admin/reports/sales/best-selling-products
   * Get best selling products
   */
  @Get('sales/best-selling-products')
  @Permissions('reports:read')
  @HttpCode(HttpStatus.OK)
  async getBestSellingProducts(
    @Query() filterDto: ReportFilterDto,
    @Query('limit') limit?: string,
  ) {
    const { startDate, endDate } = filterDto.getDateRange();
    return this.reportsService.getBestSellingProducts(
      startDate,
      endDate,
      limit ? parseInt(limit) : undefined,
    );
  }

  /**
   * GET /admin/reports/sales/by-category
   * Get revenue breakdown by category
   */
  @Get('sales/by-category')
  @Permissions('reports:read')
  @HttpCode(HttpStatus.OK)
  async getRevenueByCategory(@Query() filterDto: ReportFilterDto) {
    const { startDate, endDate } = filterDto.getDateRange();
    return this.reportsService.getRevenueByCategory(startDate, endDate);
  }

  /**
   * GET /admin/reports/sales/aov-trends
   * Get average order value trends
   */
  @Get('sales/aov-trends')
  @Permissions('reports:read')
  @HttpCode(HttpStatus.OK)
  async getAOVTrends(@Query() filterDto: ReportFilterDto) {
    const { startDate, endDate } = filterDto.getDateRange();
    return this.reportsService.getAOVTrends(startDate, endDate);
  }

  // ========== Order Reports ==========

  /**
   * GET /admin/reports/orders/status
   * Get order status distribution
   */
  @Get('orders/status')
  @Permissions('reports:read')
  @HttpCode(HttpStatus.OK)
  async getOrderStatusReport(@Query() filterDto: ReportFilterDto) {
    const { startDate, endDate } = filterDto.getDateRange();
    return this.reportsService.getOrderStatusReport(startDate, endDate);
  }

  // ========== Cart Reports ==========

  /**
   * GET /admin/reports/carts/statistics
   * Get cart conversion and abandonment statistics
   */
  @Get('carts/statistics')
  @Permissions('reports:read')
  @HttpCode(HttpStatus.OK)
  async getCartStatistics(@Query() filterDto: ReportFilterDto) {
    const { startDate, endDate } = filterDto.getDateRange();
    return this.reportsService.getCartStatistics(startDate, endDate);
  }

  /**
   * GET /admin/reports/carts/abandoned
   * Get abandoned cart details
   */
  @Get('carts/abandoned')
  @Permissions('reports:read')
  @HttpCode(HttpStatus.OK)
  async getAbandonedCartDetails(
    @Query() filterDto: ReportFilterDto,
    @Query('limit') limit?: string,
  ) {
    const { startDate, endDate } = filterDto.getDateRange();
    return this.reportsService.getAbandonedCartDetails(
      startDate,
      endDate,
      limit ? parseInt(limit) : undefined,
    );
  }

  /**
   * GET /admin/reports/carts/average-value
   * Get average cart value
   */
  @Get('carts/average-value')
  @Permissions('reports:read')
  @HttpCode(HttpStatus.OK)
  async getAverageCartValue(@Query() filterDto: ReportFilterDto) {
    const { startDate, endDate } = filterDto.getDateRange();
    return this.reportsService.getAverageCartValue(startDate, endDate);
  }

  /**
   * GET /admin/reports/carts/overview
   * Get comprehensive cart report
   */
  @Get('carts/overview')
  @Permissions('reports:read')
  @HttpCode(HttpStatus.OK)
  async getCartReport(@Query() filterDto: ReportFilterDto) {
    const { startDate, endDate } = filterDto.getDateRange();
    return this.reportsService.getCartReport(startDate, endDate);
  }

  // ========== Dashboard ==========

  /**
   * GET /admin/reports/dashboard
   * Get comprehensive dashboard summary
   */
  @Get('dashboard')
  @Permissions('reports:read')
  @HttpCode(HttpStatus.OK)
  async getDashboardSummary(@Query() filterDto: ReportFilterDto) {
    const { startDate, endDate } = filterDto.getDateRange();
    return this.reportsService.getDashboardSummary(startDate, endDate);
  }
}

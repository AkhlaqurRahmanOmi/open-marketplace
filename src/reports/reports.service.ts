import { Injectable } from '@nestjs/common';
import { OrdersService } from '../orders/orders.service';
import { CartService } from '../cart/cart.service';

/**
 * ReportsService orchestrates calls to other module services
 * to generate comprehensive reports
 */
@Injectable()
export class ReportsService {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly cartService: CartService,
  ) {}

  // ========== Sales & Order Reports ==========

  /**
   * Get sales overview report
   */
  async getSalesOverview(startDate: Date, endDate: Date) {
    return this.ordersService.getSalesOverview(startDate, endDate);
  }

  /**
   * Get top customers by revenue
   */
  async getTopCustomers(startDate: Date, endDate: Date, limit?: number) {
    return this.ordersService.getTopCustomers(startDate, endDate, limit);
  }

  /**
   * Get order status distribution
   */
  async getOrderStatusReport(startDate: Date, endDate: Date) {
    return this.ordersService.getOrderStatusReport(startDate, endDate);
  }

  /**
   * Get best selling products
   */
  async getBestSellingProducts(startDate: Date, endDate: Date, limit?: number) {
    return this.ordersService.getBestSellingProducts(startDate, endDate, limit);
  }

  /**
   * Get revenue by category
   */
  async getRevenueByCategory(startDate: Date, endDate: Date) {
    return this.ordersService.getRevenueByCategory(startDate, endDate);
  }

  /**
   * Get average order value trends
   */
  async getAOVTrends(startDate: Date, endDate: Date) {
    return this.ordersService.getAOVTrends(startDate, endDate);
  }

  // ========== Cart Reports ==========

  /**
   * Get cart statistics (conversion, abandonment rates)
   */
  async getCartStatistics(startDate: Date, endDate: Date) {
    return this.cartService.getCartStatistics(startDate, endDate);
  }

  /**
   * Get abandoned cart details
   */
  async getAbandonedCartDetails(startDate: Date, endDate: Date, limit?: number) {
    return this.cartService.getAbandonedCartDetails(startDate, endDate, limit);
  }

  /**
   * Get average cart value
   */
  async getAverageCartValue(startDate: Date, endDate: Date) {
    return this.cartService.getAverageCartValue(startDate, endDate);
  }

  /**
   * Get comprehensive cart report
   */
  async getCartReport(startDate: Date, endDate: Date) {
    return this.cartService.getCartReport(startDate, endDate);
  }

  // ========== Dashboard Summary ==========

  /**
   * Get comprehensive dashboard summary
   * Combines key metrics from all modules
   */
  async getDashboardSummary(startDate: Date, endDate: Date) {
    const [salesOverview, cartStats] = await Promise.all([
      this.ordersService.getSalesOverview(startDate, endDate),
      this.cartService.getCartReport(startDate, endDate),
    ]);

    return {
      sales: salesOverview.summary,
      cart: cartStats,
      period: {
        startDate,
        endDate,
      },
    };
  }
}

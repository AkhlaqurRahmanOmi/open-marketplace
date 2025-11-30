import { Injectable } from '@nestjs/common';
import { OrderRepository } from '../repositories/order.repository';
import { PrismaService } from '../../core/config/prisma/prisma.service';

/**
 * Provider for order-related reports and analytics
 * Uses OrderRepository for all database queries
 */
@Injectable()
export class OrderReportsProvider {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Get comprehensive sales overview report
   */
  async getSalesOverview(startDate: Date, endDate: Date) {
    const [totalStats, statusBreakdown, dailyTrends] = await Promise.all([
      this.orderRepository.getSalesAggregation(startDate, endDate),
      this.orderRepository.getStatusBreakdown(startDate, endDate),
      this.orderRepository.getDailyTrends(startDate, endDate),
    ]);

    return {
      summary: {
        totalRevenue: totalStats._sum.totalAmount || 0,
        totalOrders: totalStats._count.id,
        averageOrderValue: totalStats._avg.totalAmount || 0,
        totalSubtotal: totalStats._sum.subtotalAmount || 0,
        totalDiscount: totalStats._sum.discountAmount || 0,
        totalTax: totalStats._sum.taxAmount || 0,
        totalShipping: totalStats._sum.shippingAmount || 0,
      },
      statusBreakdown: statusBreakdown.map((item) => ({
        status: item.currentStatus,
        count: item._count.id,
        revenue: item._sum.totalAmount || 0,
      })),
      dailyTrends: dailyTrends.map((item) => ({
        date: item.date,
        orderCount: Number(item.orderCount),
        revenue: item.revenue || 0,
      })),
    };
  }

  /**
   * Get top customers with user details
   */
  async getTopCustomers(startDate: Date, endDate: Date, limit: number = 10) {
    const topCustomers = await this.orderRepository.getTopCustomersByRevenue(
      startDate,
      endDate,
      limit,
    );

    // Fetch user details
    const userIds = topCustomers.map((c) => c.userId);
    const users = await this.prisma.user.findMany({
      where: {
        id: {
          in: userIds,
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    return topCustomers.map((customer) => {
      const user = userMap.get(customer.userId);
      return {
        userId: customer.userId,
        email: user?.email,
        name: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
        totalRevenue: customer._sum.totalAmount || 0,
        orderCount: customer._count.id,
        averageOrderValue:
          (customer._sum.totalAmount || 0) / customer._count.id,
      };
    });
  }

  /**
   * Get order status distribution with percentages
   */
  async getOrderStatusReport(startDate: Date, endDate: Date) {
    const statusCounts = await this.orderRepository.getStatusBreakdown(
      startDate,
      endDate,
    );

    const total = statusCounts.reduce((sum, item) => sum + item._count.id, 0);

    return statusCounts.map((item) => ({
      status: item.currentStatus,
      count: item._count.id,
      percentage: total > 0 ? (item._count.id / total) * 100 : 0,
      revenue: item._sum.totalAmount || 0,
    }));
  }

  /**
   * Get best selling products with product details
   */
  async getBestSellingProducts(startDate: Date, endDate: Date, limit: number = 10) {
    const topProducts = await this.orderRepository.getBestSellingProducts(
      startDate,
      endDate,
      limit,
    );

    // Fetch variant and product details
    const variantIds = topProducts
      .map((p) => p.variantId)
      .filter((id): id is number => id !== null);

    const variants = await this.prisma.variant.findMany({
      where: {
        id: {
          in: variantIds,
        },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const variantMap = new Map(variants.map((v) => [v.id, v]));

    return topProducts.map((item) => {
      const variant = item.variantId ? variantMap.get(item.variantId) : null;
      return {
        variantId: item.variantId,
        productId: variant?.product.id,
        productName: variant?.product.name || 'Unknown',
        sku: variant?.sku,
        quantitySold: item._sum.quantity || 0,
        revenue: item._sum.lineTotal || 0,
      };
    });
  }

  /**
   * Get revenue breakdown by category
   */
  async getRevenueByCategory(startDate: Date, endDate: Date) {
    const categoryRevenue = await this.orderRepository.getRevenueByCategory(
      startDate,
      endDate,
    );

    return categoryRevenue.map((item) => ({
      categoryId: item.categoryId,
      categoryName: item.categoryName,
      revenue: item.revenue || 0,
      orderCount: Number(item.orderCount),
    }));
  }

  /**
   * Get average order value trends over time
   */
  async getAOVTrends(startDate: Date, endDate: Date) {
    const trends = await this.orderRepository.getAOVTrends(startDate, endDate);

    return trends.map((item) => ({
      date: item.date,
      avgOrderValue: item.avgOrderValue || 0,
      orderCount: Number(item.orderCount),
    }));
  }
}

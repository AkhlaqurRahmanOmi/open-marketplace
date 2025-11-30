import { Injectable } from '@nestjs/common';
import { CartRepository } from '../repositories';

/**
 * Provider for cart-related reports and analytics
 * Uses CartRepository for all database queries
 */
@Injectable()
export class CartReportsProvider {
  constructor(private readonly cartRepository: CartRepository) {}

  /**
   * Get cart conversion and abandonment statistics
   */
  async getCartStatistics(startDate: Date, endDate: Date) {
    return this.cartRepository.getCartStatistics(startDate, endDate);
  }

  /**
   * Get detailed list of abandoned carts
   */
  async getAbandonedCartDetails(startDate: Date, endDate: Date, limit?: number) {
    const abandonedCarts = await this.cartRepository.getAbandonedCartDetails(
      startDate,
      endDate,
      limit,
    );

    return abandonedCarts.map((cart) => {
      const total = cart.cartItems.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0,
      );

      return {
        cartId: cart.id,
        userId: cart.userId,
        userEmail: cart.user?.email,
        userName: cart.user
          ? `${cart.user.firstName} ${cart.user.lastName}`
          : null,
        itemCount: cart.cartItems.length,
        cartTotal: total,
        lastActivity: cart.lastActivityAt,
        items: cart.cartItems.map((item) => ({
          productName: item.variant?.product?.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.unitPrice * item.quantity,
        })),
      };
    });
  }

  /**
   * Get average cart value
   */
  async getAverageCartValue(startDate: Date, endDate: Date) {
    return this.cartRepository.getAverageCartValue(startDate, endDate);
  }

  /**
   * Get comprehensive cart report
   */
  async getCartReport(startDate: Date, endDate: Date) {
    const [statistics, avgValue] = await Promise.all([
      this.cartRepository.getCartStatistics(startDate, endDate),
      this.cartRepository.getAverageCartValue(startDate, endDate),
    ]);

    return {
      ...statistics,
      averageCartValue: avgValue,
    };
  }
}

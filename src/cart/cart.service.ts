import { Injectable } from '@nestjs/common';
import {
  CartInventoryProvider,
  CartManagementProvider,
  CartPricingProvider,
  CartReportsProvider,
} from './providers';
import { AddToCartDto, UpdateCartItemDto, CartFilterDto } from './dtos';
import { CartRepository } from './repositories';

/**
 * CartService is a facade that exposes a simplified API
 * while coordinating multiple underlying providers.
 */
@Injectable()
export class CartService {
  constructor(
    private readonly cartManagement: CartManagementProvider,
    private readonly cartPricing: CartPricingProvider,
    private readonly cartInventory: CartInventoryProvider,
    private readonly cartReports: CartReportsProvider,
    private readonly cartRepository: CartRepository,
  ) {}

  // ========== Cart Management ==========

  /**
   * Get or create cart for user/session
   */
  async getOrCreateCart(userId?: number, sessionId?: string) {
    return this.cartManagement.getOrCreateCart(userId, sessionId);
  }

  /**
   * Get cart by ID
   */
  async getCartById(cartId: number) {
    return this.cartManagement.getCartById(cartId);
  }

  /**
   * Get cart with stock information
   */
  async getCartWithStockInfo(cartId: number) {
    return this.cartManagement.getCartWithStockInfo(cartId);
  }

  /**
   * Add item to cart
   */
  async addItemToCart(cartId: number, dto: AddToCartDto) {
    return this.cartManagement.addItemToCart(cartId, dto);
  }

  /**
   * Update cart item quantity
   */
  async updateCartItemQuantity(
    cartId: number,
    itemId: number,
    dto: UpdateCartItemDto,
  ) {
    return this.cartManagement.updateCartItemQuantity(cartId, itemId, dto);
  }

  /**
   * Remove item from cart
   */
  async removeCartItem(cartId: number, itemId: number) {
    return this.cartManagement.removeCartItem(cartId, itemId);
  }

  /**
   * Clear all items from cart
   */
  async clearCart(cartId: number) {
    return this.cartManagement.clearCart(cartId);
  }

  /**
   * Merge session cart with user cart (after login)
   */
  async mergeSessionCartWithUserCart(sessionId: string, userId: number) {
    return this.cartManagement.mergeSessionCartWithUserCart(sessionId, userId);
  }

  /**
   * Validate cart for checkout
   */
  async validateCartForCheckout(cartId: number) {
    return this.cartManagement.validateCartForCheckout(cartId);
  }

  /**
   * Convert cart to order status
   */
  async convertCartToOrder(cartId: number) {
    return this.cartManagement.convertCartToOrder(cartId);
  }

  // ========== Cart Pricing ==========

  /**
   * Get cart summary with pricing
   */
  async getCartSummary(
    cartId: number,
    options?: {
      discount?: number;
      taxRate?: number;
      shippingAmount?: number;
    },
  ) {
    return this.cartPricing.getCartSummary(cartId, options);
  }

  /**
   * Calculate cart subtotal
   */
  async calculateSubtotal(cartId: number) {
    return this.cartPricing.calculateSubtotal(cartId);
  }

  /**
   * Get total weight (for shipping calculation)
   */
  async getTotalWeight(cartId: number) {
    return this.cartPricing.getTotalWeight(cartId);
  }

  /**
   * Check if cart meets minimum order amount
   */
  async meetsMinimumOrder(cartId: number, minimumAmount: number) {
    return this.cartPricing.meetsMinimumOrder(cartId, minimumAmount);
  }

  // ========== Cart Inventory ==========

  /**
   * Check stock availability for variant
   */
  async checkStockAvailability(variantId: number, quantity: number) {
    return this.cartInventory.checkAvailability(variantId, quantity);
  }

  /**
   * Reserve stock for cart items
   */
  async reserveCartStock(
    cartItems: Array<{
      variantId: number | null;
      quantity: number;
      cartItemId: number;
    }>,
  ) {
    return this.cartInventory.reserveCartStock(cartItems);
  }

  /**
   * Release stock reservations
   */
  async releaseCartStock(
    reservations: Array<{
      variantId: number;
      locationId: number;
      quantity: number;
    }>,
  ) {
    return this.cartInventory.releaseCartStock(reservations);
  }

  // ========== Cart Lifecycle ==========

  /**
   * Mark abandoned carts
   */
  async markAbandonedCarts() {
    return this.cartManagement.markAbandonedCarts();
  }

  /**
   * Mark expired carts
   */
  async markExpiredCarts() {
    return this.cartManagement.markExpiredCarts();
  }

  /**
   * Cleanup expired carts
   */
  async cleanupExpiredCarts() {
    return this.cartManagement.cleanupExpiredCarts();
  }

  /**
   * Get abandoned carts for reminders
   */
  async getAbandonedCartsForReminders(daysSinceAbandoned: number = 1) {
    return this.cartManagement.getAbandonedCartsForReminders(
      daysSinceAbandoned,
    );
  }

  // ========== Admin Operations ==========

  /**
   * Get all carts with filters (admin)
   */
  async getAllCarts(filterDto: CartFilterDto) {
    return this.cartRepository.findWithFilters({
      pagination: {
        page: filterDto.page || 1,
        limit: filterDto.limit || 10,
      },
      filters: {
        status: filterDto.status,
        userId: filterDto.userId,
        sessionId: filterDto.sessionId,
      },
      sort: {
        field: filterDto.sortBy || 'createdAt',
        order: filterDto.sortOrder || 'desc',
      },
    });
  }

  /**
   * Get cart count
   */
  async getCartCount(filters?: any) {
    return this.cartRepository.countTotal(filters);
  }

  // ========== Report Operations ==========

  /**
   * Get cart statistics (conversion, abandonment rates)
   */
  async getCartStatistics(startDate: Date, endDate: Date) {
    return this.cartReports.getCartStatistics(startDate, endDate);
  }

  /**
   * Get abandoned cart details
   */
  async getAbandonedCartDetails(startDate: Date, endDate: Date, limit?: number) {
    return this.cartReports.getAbandonedCartDetails(startDate, endDate, limit);
  }

  /**
   * Get average cart value
   */
  async getAverageCartValue(startDate: Date, endDate: Date) {
    return this.cartReports.getAverageCartValue(startDate, endDate);
  }

  /**
   * Get comprehensive cart report
   */
  async getCartReport(startDate: Date, endDate: Date) {
    return this.cartReports.getCartReport(startDate, endDate);
  }
}

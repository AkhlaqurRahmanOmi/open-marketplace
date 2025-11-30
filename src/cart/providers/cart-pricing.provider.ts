import { Injectable } from '@nestjs/common';
import { CartItemRepository } from '../repositories';

export interface CartSummary {
  subtotal: number;
  discount: number;
  taxAmount: number;
  shippingAmount: number;
  total: number;
  currency: string;
  itemCount: number;
  totalQuantity: number;
}

export interface ItemPricing {
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  discount: number;
  finalPrice: number;
}

@Injectable()
export class CartPricingProvider {
  private readonly DEFAULT_TAX_RATE = 0.0; // 0% tax by default
  private readonly DEFAULT_CURRENCY = 'USD';

  constructor(private readonly cartItemRepository: CartItemRepository) {}

  /**
   * Calculate cart subtotal (sum of all items)
   */
  async calculateSubtotal(cartId: number): Promise<number> {
    const items = await this.cartItemRepository.findByCartId(cartId);

    return items.reduce((sum, item) => {
      return sum + item.unitPrice * item.quantity;
    }, 0);
  }

  /**
   * Calculate item line total
   */
  calculateItemLineTotal(unitPrice: number, quantity: number): number {
    return unitPrice * quantity;
  }

  /**
   * Calculate tax amount
   */
  calculateTax(subtotal: number, taxRate?: number): number {
    const rate = taxRate ?? this.DEFAULT_TAX_RATE;
    return subtotal * rate;
  }

  /**
   * Calculate cart total
   */
  calculateTotal(
    subtotal: number,
    discount: number = 0,
    taxAmount: number = 0,
    shippingAmount: number = 0,
  ): number {
    return subtotal - discount + taxAmount + shippingAmount;
  }

  /**
   * Get comprehensive cart summary
   */
  async getCartSummary(
    cartId: number,
    options?: {
      discount?: number;
      taxRate?: number;
      shippingAmount?: number;
    },
  ): Promise<CartSummary> {
    const items = await this.cartItemRepository.findByCartId(cartId);

    // Calculate subtotal
    const subtotal = items.reduce((sum, item) => {
      return sum + item.unitPrice * item.quantity;
    }, 0);

    // Get discount (from options or 0)
    const discount = options?.discount ?? 0;

    // Calculate tax
    const taxAmount = this.calculateTax(subtotal - discount, options?.taxRate);

    // Get shipping amount
    const shippingAmount = options?.shippingAmount ?? 0;

    // Calculate total
    const total = this.calculateTotal(
      subtotal,
      discount,
      taxAmount,
      shippingAmount,
    );

    // Get currency (from first item or default)
    const currency = items[0]?.currency ?? this.DEFAULT_CURRENCY;

    // Get item count and total quantity
    const itemCount = items.length;
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      subtotal: this.roundToTwoDecimals(subtotal),
      discount: this.roundToTwoDecimals(discount),
      taxAmount: this.roundToTwoDecimals(taxAmount),
      shippingAmount: this.roundToTwoDecimals(shippingAmount),
      total: this.roundToTwoDecimals(total),
      currency,
      itemCount,
      totalQuantity,
    };
  }

  /**
   * Calculate item-level pricing
   */
  calculateItemPricing(
    unitPrice: number,
    quantity: number,
    discount: number = 0,
  ): ItemPricing {
    const lineTotal = this.calculateItemLineTotal(unitPrice, quantity);
    const finalPrice = lineTotal - discount;

    return {
      unitPrice: this.roundToTwoDecimals(unitPrice),
      quantity,
      lineTotal: this.roundToTwoDecimals(lineTotal),
      discount: this.roundToTwoDecimals(discount),
      finalPrice: this.roundToTwoDecimals(finalPrice),
    };
  }

  /**
   * Apply percentage discount
   */
  applyPercentageDiscount(amount: number, percentage: number): number {
    if (percentage < 0 || percentage > 100) {
      throw new Error('Discount percentage must be between 0 and 100');
    }
    return this.roundToTwoDecimals(amount * (percentage / 100));
  }

  /**
   * Apply fixed discount
   */
  applyFixedDiscount(amount: number, discount: number): number {
    const finalAmount = amount - discount;
    return this.roundToTwoDecimals(Math.max(0, finalAmount));
  }

  /**
   * Round to two decimal places
   */
  private roundToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100;
  }

  /**
   * Convert currency (placeholder - integrate with currency service later)
   */
  async convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
  ): Promise<number> {
    // TODO: Integrate with currency conversion service
    // For now, return the same amount
    if (fromCurrency === toCurrency) {
      return amount;
    }

    // Placeholder conversion rates
    const conversionRates: Record<string, Record<string, number>> = {
      USD: { EUR: 0.85, GBP: 0.73 },
      EUR: { USD: 1.18, GBP: 0.86 },
      GBP: { USD: 1.37, EUR: 1.16 },
    };

    const rate = conversionRates[fromCurrency]?.[toCurrency];
    if (rate) {
      return this.roundToTwoDecimals(amount * rate);
    }

    return amount;
  }

  /**
   * Get total weight of cart (for shipping calculation)
   */
  async getTotalWeight(cartId: number): Promise<number> {
    const items = await this.cartItemRepository.findByCartId(cartId);

    return items.reduce((sum, item) => {
      const weight = (item as any).variant?.weight ?? 0;
      return sum + weight * item.quantity;
    }, 0);
  }

  /**
   * Check if cart meets minimum order amount
   */
  async meetsMinimumOrder(
    cartId: number,
    minimumAmount: number,
  ): Promise<boolean> {
    const subtotal = await this.calculateSubtotal(cartId);
    return subtotal >= minimumAmount;
  }
}

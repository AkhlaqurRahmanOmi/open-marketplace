import { Injectable, BadRequestException, forwardRef, Inject } from '@nestjs/common';
import { InventoryService } from '../../inventory/inventory.service';

export interface StockAvailability {
  available: boolean;
  availableQuantity: number;
  message?: string;
}

export interface CartItemValidation {
  variantId: number;
  quantity: number;
  cartItemId?: number;
}

export interface ValidationResult {
  isValid: boolean;
  issues: Array<{
    variantId: number;
    cartItemId?: number;
    issue: string;
    availableQuantity: number;
  }>;
}

@Injectable()
export class CartInventoryProvider {
  private readonly LOW_STOCK_THRESHOLD = 10;

  constructor(
    @Inject(forwardRef(() => InventoryService))
    private readonly inventoryService: InventoryService,
  ) {}

  /**
   * Check if variant is available for cart
   */
  async checkAvailability(
    variantId: number,
    quantity: number,
  ): Promise<StockAvailability> {
    // Get total available quantity across all locations
    const availableQty =
      await this.inventoryService.getTotalAvailableQuantity(variantId);

    if (availableQty === 0) {
      return {
        available: false,
        availableQuantity: 0,
        message: 'This product is currently out of stock',
      };
    }

    if (availableQty < quantity) {
      return {
        available: false,
        availableQuantity: availableQty,
        message: `Only ${availableQty} unit${availableQty > 1 ? 's' : ''} available`,
      };
    }

    return {
      available: true,
      availableQuantity: availableQty,
    };
  }

  /**
   * Validate all cart items (check stock availability)
   */
  async validateCartItems(
    cartItems: CartItemValidation[],
  ): Promise<ValidationResult> {
    const issues: Array<{
      variantId: number;
      cartItemId?: number;
      issue: string;
      availableQuantity: number;
    }> = [];

    for (const item of cartItems) {
      const check = await this.checkAvailability(item.variantId, item.quantity);

      if (!check.available) {
        issues.push({
          variantId: item.variantId,
          cartItemId: item.cartItemId,
          issue: check.message || 'Stock unavailable',
          availableQuantity: check.availableQuantity,
        });
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }

  /**
   * Check if variant is low in stock
   */
  async isLowStock(variantId: number): Promise<boolean> {
    const available =
      await this.inventoryService.getTotalAvailableQuantity(variantId);
    return available > 0 && available <= this.LOW_STOCK_THRESHOLD;
  }

  /**
   * Get stock info for a variant
   */
  async getStockInfo(variantId: number) {
    const available =
      await this.inventoryService.getTotalAvailableQuantity(variantId);
    const total = await this.inventoryService.getTotalQuantity(variantId);
    const isLow = available > 0 && available <= this.LOW_STOCK_THRESHOLD;

    return {
      available,
      total,
      isLowStock: isLow,
      isOutOfStock: available === 0,
    };
  }

  /**
   * Reserve stock for cart items at checkout
   */
  async reserveCartStock(
    cartItems: Array<{
      variantId: number | null;
      quantity: number;
      cartItemId: number;
    }>,
  ): Promise<{
    success: boolean;
    reservations: Array<{ cartItemId: number; locationId: number }>;
    failures: Array<{ cartItemId: number; reason: string }>;
  }> {
    const reservations: Array<{ cartItemId: number; locationId: number }> = [];
    const failures: Array<{ cartItemId: number; reason: string }> = [];

    for (const item of cartItems) {
      if (!item.variantId) {
        // Skip bundles or items without variants
        continue;
      }

      try {
        // Find best location for fulfillment
        const locationId =
          await this.inventoryService.findBestLocationForFulfillment(
            item.variantId,
            item.quantity,
          );

        if (!locationId) {
          failures.push({
            cartItemId: item.cartItemId,
            reason: 'No location has sufficient stock',
          });
          continue;
        }

        // Reserve stock
        await this.inventoryService.reserveStock({
          variantId: item.variantId,
          locationId,
          quantity: item.quantity,
        });

        reservations.push({
          cartItemId: item.cartItemId,
          locationId,
        });
      } catch (error) {
        failures.push({
          cartItemId: item.cartItemId,
          reason: error.message || 'Failed to reserve stock',
        });
      }
    }

    return {
      success: failures.length === 0,
      reservations,
      failures,
    };
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
  ): Promise<void> {
    for (const reservation of reservations) {
      try {
        await this.inventoryService.releaseStock({
          variantId: reservation.variantId,
          locationId: reservation.locationId,
          quantity: reservation.quantity,
        });
      } catch (error) {
        // Log error but continue releasing others
        console.error(
          `Failed to release stock for variant ${reservation.variantId}:`,
          error,
        );
      }
    }
  }

  /**
   * Get low stock threshold
   */
  getLowStockThreshold(): number {
    return this.LOW_STOCK_THRESHOLD;
  }
}

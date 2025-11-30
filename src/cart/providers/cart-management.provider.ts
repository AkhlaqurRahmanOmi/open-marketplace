import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { CartRepository, CartItemRepository } from '../repositories';
import { CartInventoryProvider } from './cart-inventory.provider';
import { AddToCartDto, UpdateCartItemDto } from '../dtos';
import { Cart, CartItem, CartStatus } from '@prisma/client';
import { PrismaService } from '../../core/config/prisma/prisma.service';

@Injectable()
export class CartManagementProvider {
  private readonly ANONYMOUS_CART_EXPIRY_DAYS = 7;
  private readonly AUTHENTICATED_CART_ABANDONED_DAYS = 7;
  private readonly AUTHENTICATED_CART_EXPIRY_DAYS = 30;

  constructor(
    private readonly cartRepository: CartRepository,
    private readonly cartItemRepository: CartItemRepository,
    private readonly cartInventory: CartInventoryProvider,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Get or create cart for user/session
   */
  async getOrCreateCart(userId?: number, sessionId?: string): Promise<Cart> {
    // Try to find existing active cart
    let cart: Cart | null = null;

    if (userId) {
      cart = await this.cartRepository.findActiveByUserId(userId);
    } else if (sessionId) {
      cart = await this.cartRepository.findBySessionId(sessionId);
    }

    // Create new cart if not found
    if (!cart) {
      cart = await this.cartRepository.create({
        userId: userId || null,
        sessionId: sessionId || null,
        status: CartStatus.active,
        lastActivityAt: new Date(),
      });
    }

    return cart;
  }

  /**
   * Get cart by ID
   */
  async getCartById(cartId: number): Promise<Cart> {
    const cart = await this.cartRepository.findById(cartId);

    if (!cart) {
      throw new NotFoundException(`Cart with ID ${cartId} not found`);
    }

    return cart;
  }

  /**
   * Add item to cart with stock validation
   */
  async addItemToCart(cartId: number, dto: AddToCartDto): Promise<CartItem> {
    const { variantId, bundleId, quantity } = dto;

    // Validate only one of variantId or bundleId
    if ((variantId && bundleId) || (!variantId && !bundleId)) {
      throw new BadRequestException(
        'Provide either variantId or bundleId, not both',
      );
    }

    // Verify cart exists
    const cart = await this.cartRepository.findById(cartId);
    if (!cart) {
      throw new NotFoundException(`Cart with ID ${cartId} not found`);
    }

    // Check if cart is active
    if (cart.status !== CartStatus.active) {
      throw new BadRequestException('Cannot add items to inactive cart');
    }

    // Check stock availability (for variants only)
    if (variantId) {
      const stockCheck = await this.cartInventory.checkAvailability(
        variantId,
        quantity,
      );

      if (!stockCheck.available) {
        throw new BadRequestException(
          stockCheck.message || 'Insufficient stock available',
        );
      }

      // Verify variant exists
      const variant = await this.prisma.variant.findUnique({
        where: { id: variantId },
        include: { product: true },
      });

      if (!variant) {
        throw new NotFoundException(`Variant with ID ${variantId} not found`);
      }

      if (!variant.isActive || !variant.product.isActive) {
        throw new BadRequestException('This product is not available');
      }
    }

    // Check if bundle exists
    if (bundleId) {
      const bundle = await this.prisma.bundle.findUnique({
        where: { id: bundleId },
      });

      if (!bundle) {
        throw new NotFoundException(`Bundle with ID ${bundleId} not found`);
      }

      if (!bundle.isActive) {
        throw new BadRequestException('This bundle is not available');
      }
    }

    // Check if item already exists in cart
    let existingItem: CartItem | null = null;

    if (variantId) {
      existingItem = await this.cartItemRepository.findByCartAndVariant(
        cartId,
        variantId,
      );
    } else if (bundleId) {
      existingItem = await this.cartItemRepository.findByCartAndBundle(
        cartId,
        bundleId,
      );
    }

    if (existingItem) {
      // Update quantity instead
      const newQuantity = existingItem.quantity + quantity;

      // Re-check stock for new quantity (for variants)
      if (variantId) {
        const stockCheck = await this.cartInventory.checkAvailability(
          variantId,
          newQuantity,
        );

        if (!stockCheck.available) {
          throw new BadRequestException(
            `Cannot add ${quantity} more. ${stockCheck.message}`,
          );
        }
      }

      const updatedItem = await this.cartItemRepository.update(
        existingItem.id,
        {
          quantity: newQuantity,
        },
      );

      // Touch cart
      await this.cartRepository.touchCart(cartId);

      return updatedItem;
    }

    // Get current price
    let unitPrice: number;
    let currency: string = 'USD';

    if (variantId) {
      const variant = await this.prisma.variant.findUnique({
        where: { id: variantId },
      });
      unitPrice = variant!.price;
      currency = variant!.currency;
    } else {
      const bundle = await this.prisma.bundle.findUnique({
        where: { id: bundleId },
      });
      unitPrice = bundle!.price;
    }

    // Create new cart item
    const cartItem = await this.cartItemRepository.create({
      cartId,
      variantId: variantId || null,
      bundleId: bundleId || null,
      quantity,
      unitPrice,
      currency,
    });

    // Touch cart
    await this.cartRepository.touchCart(cartId);

    return cartItem;
  }

  /**
   * Update cart item quantity with stock validation
   */
  async updateCartItemQuantity(
    cartId: number,
    itemId: number,
    dto: UpdateCartItemDto,
  ): Promise<CartItem> {
    const { quantity } = dto;

    // Get cart item
    const cartItem = await this.cartItemRepository.findById(itemId);

    if (!cartItem || cartItem.cartId !== cartId) {
      throw new NotFoundException('Cart item not found');
    }

    // Check stock availability (for variants)
    if (cartItem.variantId) {
      const stockCheck = await this.cartInventory.checkAvailability(
        cartItem.variantId,
        quantity,
      );

      if (!stockCheck.available) {
        throw new BadRequestException(
          stockCheck.message || 'Insufficient stock available',
        );
      }
    }

    // Update quantity
    const updatedItem = await this.cartItemRepository.update(itemId, {
      quantity,
    });

    // Touch cart
    await this.cartRepository.touchCart(cartId);

    return updatedItem;
  }

  /**
   * Remove item from cart
   */
  async removeCartItem(cartId: number, itemId: number): Promise<void> {
    // Verify cart item exists and belongs to cart
    const cartItem = await this.cartItemRepository.findById(itemId);

    if (!cartItem || cartItem.cartId !== cartId) {
      throw new NotFoundException('Cart item not found');
    }

    await this.cartItemRepository.delete(itemId);

    // Touch cart
    await this.cartRepository.touchCart(cartId);
  }

  /**
   * Clear all items from cart
   */
  async clearCart(cartId: number): Promise<void> {
    await this.cartItemRepository.deleteByCartId(cartId);

    // Touch cart
    await this.cartRepository.touchCart(cartId);
  }

  /**
   * Get cart with stock info
   */
  async getCartWithStockInfo(cartId: number) {
    const cart = await this.cartRepository.findById(cartId);

    if (!cart) {
      throw new NotFoundException(`Cart with ID ${cartId} not found`);
    }

    const cartItems = await this.cartItemRepository.findByCartId(cartId);

    // Enrich with stock info
    const itemsWithStock = await Promise.all(
      cartItems.map(async (item) => {
        let stockInfo: {
          available: number;
          total: number;
          isLowStock: boolean;
          isOutOfStock: boolean;
        } | null = null;

        if (item.variantId) {
          stockInfo = await this.cartInventory.getStockInfo(item.variantId);
        }

        return {
          ...item,
          stockInfo,
        };
      }),
    );

    return {
      ...cart,
      items: itemsWithStock,
    };
  }

  /**
   * Validate cart for checkout
   */
  async validateCartForCheckout(cartId: number): Promise<{
    isValid: boolean;
    issues: any[];
  }> {
    const cart = await this.cartRepository.findById(cartId);

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    if (cart.status !== CartStatus.active) {
      throw new BadRequestException('Cart is not active');
    }

    const cartItems = await this.cartItemRepository.findByCartId(cartId);

    if (cartItems.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // Prepare items for validation
    const itemsToValidate = cartItems
      .filter((item) => item.variantId !== null)
      .map((item) => ({
        variantId: item.variantId!,
        quantity: item.quantity,
        cartItemId: item.id,
      }));

    // Validate stock
    return this.cartInventory.validateCartItems(itemsToValidate);
  }

  /**
   * Merge session cart with user cart (after login)
   */
  async mergeSessionCartWithUserCart(
    sessionId: string,
    userId: number,
  ): Promise<Cart> {
    // Find session cart
    const sessionCart = await this.cartRepository.findBySessionId(sessionId);

    // Find or create user cart
    let userCart = await this.cartRepository.findActiveByUserId(userId);

    if (!userCart) {
      userCart = await this.cartRepository.create({
        userId,
        status: CartStatus.active,
        lastActivityAt: new Date(),
      });
    }

    if (sessionCart && (sessionCart as any).cartItems?.length > 0) {
      // Merge items from session cart to user cart
      for (const sessionItem of (sessionCart as any).cartItems) {
        try {
          // Check if item already exists in user cart
          let existingItem: CartItem | null = null;

          if (sessionItem.variantId) {
            existingItem =
              await this.cartItemRepository.findByCartAndVariant(
                userCart.id,
                sessionItem.variantId,
              );
          } else if (sessionItem.bundleId) {
            existingItem = await this.cartItemRepository.findByCartAndBundle(
              userCart.id,
              sessionItem.bundleId,
            );
          }

          if (existingItem) {
            // Update quantity (sum both)
            await this.cartItemRepository.update(existingItem.id, {
              quantity: existingItem.quantity + sessionItem.quantity,
            });
          } else {
            // Add new item to user cart
            await this.cartItemRepository.create({
              cartId: userCart.id,
              variantId: sessionItem.variantId,
              bundleId: sessionItem.bundleId,
              quantity: sessionItem.quantity,
              unitPrice: sessionItem.unitPrice,
              currency: sessionItem.currency,
            });
          }
        } catch (error) {
          // Log error but continue with other items
          console.error(`Failed to merge cart item ${sessionItem.id}:`, error);
        }
      }

      // Mark session cart as converted
      await this.cartRepository.update(sessionCart.id, {
        status: CartStatus.converted,
      });
    }

    // Touch user cart
    await this.cartRepository.touchCart(userCart.id);

    return this.cartRepository.findById(userCart.id) as Promise<Cart>;
  }

  /**
   * Mark carts as abandoned
   */
  async markAbandonedCarts(): Promise<number> {
    return this.cartRepository.markAsAbandoned(
      this.AUTHENTICATED_CART_ABANDONED_DAYS,
    );
  }

  /**
   * Mark carts as expired
   */
  async markExpiredCarts(): Promise<number> {
    return this.cartRepository.markAsExpired(
      this.ANONYMOUS_CART_EXPIRY_DAYS,
      this.AUTHENTICATED_CART_EXPIRY_DAYS,
    );
  }

  /**
   * Cleanup expired carts
   */
  async cleanupExpiredCarts(): Promise<number> {
    return this.cartRepository.deleteExpired();
  }

  /**
   * Get abandoned carts for email reminders
   */
  async getAbandonedCartsForReminders(daysSinceAbandoned: number = 1) {
    return this.cartRepository.findAbandoned(daysSinceAbandoned);
  }

  /**
   * Convert cart to order status
   */
  async convertCartToOrder(cartId: number): Promise<void> {
    await this.cartRepository.update(cartId, {
      status: CartStatus.converted,
    });
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto, UpdateCartItemDto } from './dtos';
import { Auth } from '../auth/decorator/auth.decorator';
import { AuthType } from '../auth/enums/auth-type.enum';
import { Permissions } from '../auth/decorator/permissions.decorator';
import { ActiveUser } from '../auth/decorator/active-user.decorator';
import type { ActiveUserData } from '../auth/interfaces/active-user-data.interface';

@Controller('cart')
@Auth(AuthType.None)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  // ========== Public Cart Endpoints ==========

  /**
   * Get or create cart for current user
   * Supports both authenticated (userId) and unauthenticated (sessionId) users
   */
  @Auth(AuthType.None)
  @Get('current')
  @HttpCode(HttpStatus.OK)
  async getCurrentCart(
    @ActiveUser() user: ActiveUserData | undefined,
    @Query('sessionId') sessionId?: string,
  ) {
    // Authenticated user
    if (user?.sub) {
      return this.cartService.getOrCreateCart(user.sub, undefined);
    }
    // Unauthenticated user with sessionId
    if (sessionId) {
      return this.cartService.getOrCreateCart(undefined, sessionId);
    }
    // No user and no sessionId - throw error
    throw new Error('Either authentication token or sessionId is required');
  }

  /**
   * Get cart by ID (user can only access their own cart)
   */
  @Get(':id')
  @Auth(AuthType.None)
  @HttpCode(HttpStatus.OK)
  async getCart(@Param('id', ParseIntPipe) id: number) {
    return this.cartService.getCartById(id);
  }

  /**
   * Get cart with stock information
   */
  @Get(':id/stock-info')
  @Auth(AuthType.None)
  @HttpCode(HttpStatus.OK)
  async getCartWithStockInfo(@Param('id', ParseIntPipe) id: number) {
    return this.cartService.getCartWithStockInfo(id);
  }

  /**
   * Get cart summary with pricing
   */
  @Get(':id/summary')
  // @Permissions('carts:view')
  @Auth(AuthType.None)
  @HttpCode(HttpStatus.OK)
  async getCartSummary(
    @Param('id', ParseIntPipe) id: number,
    @Query('discount') discount?: number,
    @Query('taxRate') taxRate?: number,
    @Query('shippingAmount') shippingAmount?: number,
  ) {
    return this.cartService.getCartSummary(id, {
      discount: discount ? Number(discount) : undefined,
      taxRate: taxRate ? Number(taxRate) : undefined,
      shippingAmount: shippingAmount ? Number(shippingAmount) : undefined,
    });
  }

  /**
   * Add item to cart
   */
  @Post(':id/items')
  // @Permissions('carts:create')
  @HttpCode(HttpStatus.CREATED)
  @Auth(AuthType.None)
  async addItemToCart(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddToCartDto,
  ) {
    return this.cartService.addItemToCart(id, dto);
  }

  /**
   * Update cart item quantity
   */
  @Patch(':id/items/:itemId')
  @Auth(AuthType.None)
  @HttpCode(HttpStatus.OK)
  async updateCartItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateCartItemQuantity(id, itemId, dto);
  }

  /**
   * Remove item from cart
   */
  @Delete(':id/items/:itemId')
  @Auth(AuthType.None)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeCartItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
  ) {
    await this.cartService.removeCartItem(id, itemId);
  }

  /**
   * Clear all items from cart
   */
  @Delete(':id/items')
  @Auth(AuthType.None)
  @HttpCode(HttpStatus.NO_CONTENT)
  async clearCart(@Param('id', ParseIntPipe) id: number) {
    await this.cartService.clearCart(id);
  }

  /**
   * Validate cart for checkout
   */
  @Post(':id/validate')
  @Auth(AuthType.None)
  @HttpCode(HttpStatus.OK)
  async validateCart(@Param('id', ParseIntPipe) id: number) {
    return this.cartService.validateCartForCheckout(id);
  }

  /**
   * Merge session cart with user cart (after login)
   * Requires authentication - user must be logged in
   */
  @Post('merge')
  @Auth(AuthType.Bearer)
  @HttpCode(HttpStatus.OK)
  async mergeCart(
    @Body('sessionId') sessionId: string,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.cartService.mergeSessionCartWithUserCart(sessionId, user.sub);
  }

  /**
   * Check stock availability
   */
  @Get('stock-check/:variantId')
  @Auth(AuthType.None)
  @HttpCode(HttpStatus.OK)
  async checkStock(
    @Param('variantId', ParseIntPipe) variantId: number,
    @Query('quantity', ParseIntPipe) quantity: number,
  ) {
    return this.cartService.checkStockAvailability(variantId, quantity);
  }
}

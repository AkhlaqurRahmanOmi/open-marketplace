import { Injectable, NotFoundException } from '@nestjs/common';
import { WishlistRepository } from '../repositories/wishlist.repository';
import { PrismaService } from '../../core/config/prisma/prisma.service';
import { AddToWishlistDto } from '../dtos';

@Injectable()
export class WishlistManagementProvider {
  constructor(
    private readonly wishlistRepository: WishlistRepository,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Get or create the current user's wishlist
   */
  async getOrCreateMyWishlist(userId: number) {
    return this.wishlistRepository.getOrCreateByUserId(userId);
  }

  /**
   * Get current user's wishlist with items and minimal meta
   */
  async getMyWishlist(userId: number) {
    const wishlist = await this.wishlistRepository.findByUserIdWithItems(userId);
    if (!wishlist) {
      // Create on demand (optional behavior)
      return this.wishlistRepository.getOrCreateByUserId(userId);
    }
    return wishlist;
  }

  /**
   * Get count of items in current user's wishlist
   */
  async getMyWishlistCount(userId: number) {
    return this.wishlistRepository.countItemsByUserId(userId);
  }

  /**
   * Add item (variant or bundle) to current user's wishlist
   */
  async addItemToMyWishlist(userId: number, dto: AddToWishlistDto) {
    const wishlist = await this.wishlistRepository.getOrCreateByUserId(userId);
    return this.wishlistRepository.addItem(wishlist.id, dto);
  }

  /**
   * Remove an item from current user's wishlist
   */
  async removeItemFromMyWishlist(userId: number, itemId: number) {
    const wishlist = await this.wishlistRepository.getOrCreateByUserId(userId);
    await this.wishlistRepository.removeItemById(wishlist.id, itemId);
    return { success: true };
  }

  /**
   * Clear current user's wishlist
   */
  async clearMyWishlist(userId: number) {
    const wishlist = await this.wishlistRepository.getOrCreateByUserId(userId);
    const deletedCount = await this.wishlistRepository.clear(wishlist.id);
    return { success: true, deletedCount };
  }
}

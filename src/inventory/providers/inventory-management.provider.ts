import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { VariantInventory } from '@prisma/client';
import { VariantInventoryRepository } from '../repositories';
import { MovementTrackingProvider } from './movement-tracking.provider';
import { AdjustInventoryDto, TransferInventoryDto, InventoryAdjustmentReason } from '../dtos';
import { PrismaService } from '../../core/config/prisma/prisma.service';

@Injectable()
export class InventoryManagementProvider {
  constructor(
    private readonly variantInventoryRepository: VariantInventoryRepository,
    private readonly movementTrackingProvider: MovementTrackingProvider,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Get inventory for a specific variant at all locations
   */
  async getInventoryByVariant(variantId: number): Promise<VariantInventory[]> {
    return this.variantInventoryRepository.findByVariantId(variantId);
  }

  /**
   * Get inventory for a specific location
   */
  async getInventoryByLocation(locationId: number): Promise<VariantInventory[]> {
    return this.variantInventoryRepository.findByLocationId(locationId);
  }

  /**
   * Get inventory for a specific variant at a specific location
   */
  async getInventoryByVariantAndLocation(
    variantId: number,
    locationId: number,
  ): Promise<VariantInventory | null> {
    return this.variantInventoryRepository.findByVariantAndLocation(variantId, locationId);
  }

  /**
   * Check if stock is available
   */
  async checkAvailability(
    variantId: number,
    locationId: number,
    quantity: number,
  ): Promise<boolean> {
    const inventory = await this.variantInventoryRepository.findByVariantAndLocation(
      variantId,
      locationId,
    );

    if (!inventory) {
      return false;
    }

    const available = inventory.quantity - inventory.reserved;
    return available >= quantity;
  }

  /**
   * Get total available quantity across all locations
   */
  async getTotalAvailableQuantity(variantId: number): Promise<number> {
    return this.variantInventoryRepository.getTotalAvailableQuantity(variantId);
  }

  /**
   * Get total quantity across all locations (including reserved)
   */
  async getTotalQuantity(variantId: number): Promise<number> {
    return this.variantInventoryRepository.getTotalQuantity(variantId);
  }

  /**
   * Adjust inventory (add or remove stock)
   */
  async adjustInventory(adjustDto: AdjustInventoryDto): Promise<VariantInventory> {
    const { variantId, locationId, delta, reason, orderId } = adjustDto;

    // Verify variant exists
    const variant = await this.prisma.variant.findUnique({
      where: { id: variantId },
    });
    if (!variant) {
      throw new NotFoundException(`Variant with ID ${variantId} not found`);
    }

    // Verify location exists
    const location = await this.prisma.location.findUnique({
      where: { id: locationId },
    });
    if (!location) {
      throw new NotFoundException(`Location with ID ${locationId} not found`);
    }

    // Get current inventory
    const currentInventory = await this.variantInventoryRepository.findByVariantAndLocation(
      variantId,
      locationId,
    );

    // Check if adjustment would result in negative quantity
    if (currentInventory) {
      const newQuantity = currentInventory.quantity + delta;
      if (newQuantity < 0) {
        throw new BadRequestException(
          `Cannot adjust inventory. Would result in negative quantity. Current: ${currentInventory.quantity}, Delta: ${delta}`,
        );
      }

      // Check if we have enough available quantity (not reserved)
      if (delta < 0) {
        const available = currentInventory.quantity - currentInventory.reserved;
        if (Math.abs(delta) > available) {
          throw new BadRequestException(
            `Cannot remove ${Math.abs(delta)} units. Only ${available} units available (${currentInventory.reserved} reserved)`,
          );
        }
      }
    } else if (delta < 0) {
      throw new BadRequestException('Cannot decrease inventory that does not exist');
    }

    // Update inventory
    const updatedInventory = await this.variantInventoryRepository.updateQuantity(
      variantId,
      locationId,
      delta,
    );

    // Record movement
    await this.movementTrackingProvider.recordMovement({
      variantId,
      locationId,
      delta,
      reason,
      orderId,
    });

    return updatedInventory;
  }

  /**
   * Transfer inventory between locations
   */
  async transferInventory(transferDto: TransferInventoryDto): Promise<{
    from: VariantInventory;
    to: VariantInventory;
  }> {
    const { variantId, fromLocationId, toLocationId, quantity } = transferDto;

    if (fromLocationId === toLocationId) {
      throw new BadRequestException('Cannot transfer to the same location');
    }

    // Check if source has enough available quantity
    const isAvailable = await this.checkAvailability(variantId, fromLocationId, quantity);
    if (!isAvailable) {
      throw new BadRequestException(
        `Insufficient available quantity at source location`,
      );
    }

    // Decrease from source
    const from = await this.adjustInventory({
      variantId,
      locationId: fromLocationId,
      delta: -quantity,
      reason: InventoryAdjustmentReason.TRANSFER,
    });

    // Increase at destination
    const to = await this.adjustInventory({
      variantId,
      locationId: toLocationId,
      delta: quantity,
      reason: InventoryAdjustmentReason.TRANSFER,
    });

    return { from, to };
  }

  /**
   * Get all inventory records with pagination
   */
  async getAllInventory(filterDto?: {
    page?: number;
    limit?: number;
    variantId?: number;
    locationId?: number;
  }) {
    const queryOptions: any = {
      pagination: {
        page: filterDto?.page || 1,
        limit: filterDto?.limit || 10,
      },
      filters: {},
    };

    // Add filters
    if (filterDto?.variantId) {
      queryOptions.filters.variantId = filterDto.variantId;
    }

    if (filterDto?.locationId) {
      queryOptions.filters.locationId = filterDto.locationId;
    }

    return this.variantInventoryRepository.findWithFilters(queryOptions);
  }

  /**
   * Get low stock items (where available quantity is below threshold)
   */
  async getLowStockItems(threshold: number = 10): Promise<VariantInventory[]> {
    const allInventory = await this.variantInventoryRepository.findAll();
    return allInventory.filter((inv) => {
      const available = inv.quantity - inv.reserved;
      return available <= threshold;
    });
  }
}

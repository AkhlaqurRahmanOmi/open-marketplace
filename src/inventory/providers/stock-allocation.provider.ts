import { Injectable, BadRequestException } from '@nestjs/common';
import { VariantInventory } from '@prisma/client';
import { VariantInventoryRepository } from '../repositories';
import { MovementTrackingProvider } from './movement-tracking.provider';
import { ReserveInventoryDto, ReleaseInventoryDto } from '../dtos';

@Injectable()
export class StockAllocationProvider {
  constructor(
    private readonly variantInventoryRepository: VariantInventoryRepository,
    private readonly movementTrackingProvider: MovementTrackingProvider,
  ) {}

  /**
   * Reserve stock for an order
   */
  async reserveStock(reserveDto: ReserveInventoryDto): Promise<VariantInventory> {
    const { variantId, locationId, quantity, orderId } = reserveDto;

    const inventory = await this.variantInventoryRepository.findByVariantAndLocation(
      variantId,
      locationId,
    );

    if (!inventory) {
      throw new BadRequestException(
        `No inventory found for variant ${variantId} at location ${locationId}`,
      );
    }

    const available = inventory.quantity - inventory.reserved;
    if (available < quantity) {
      throw new BadRequestException(
        `Insufficient available quantity. Requested: ${quantity}, Available: ${available}`,
      );
    }

    // Update reserved quantity
    const updatedInventory = await this.variantInventoryRepository.updateReserved(
      variantId,
      locationId,
      quantity,
    );

    // Note: We don't create a movement record for reservations as the stock hasn't actually moved
    // Movement will be recorded when the order is fulfilled and stock is deducted

    return updatedInventory;
  }

  /**
   * Release reserved stock (e.g., when order is cancelled)
   */
  async releaseStock(releaseDto: ReleaseInventoryDto): Promise<VariantInventory> {
    const { variantId, locationId, quantity, orderId } = releaseDto;

    const inventory = await this.variantInventoryRepository.findByVariantAndLocation(
      variantId,
      locationId,
    );

    if (!inventory) {
      throw new BadRequestException(
        `No inventory found for variant ${variantId} at location ${locationId}`,
      );
    }

    if (inventory.reserved < quantity) {
      throw new BadRequestException(
        `Cannot release ${quantity} units. Only ${inventory.reserved} units are reserved`,
      );
    }

    // Update reserved quantity (negative delta to decrease)
    const updatedInventory = await this.variantInventoryRepository.updateReserved(
      variantId,
      locationId,
      -quantity,
    );

    return updatedInventory;
  }

  /**
   * Fulfill reserved stock (deduct from both quantity and reserved)
   */
  async fulfillReservedStock(
    variantId: number,
    locationId: number,
    quantity: number,
    orderId?: number,
  ): Promise<VariantInventory> {
    const inventory = await this.variantInventoryRepository.findByVariantAndLocation(
      variantId,
      locationId,
    );

    if (!inventory) {
      throw new BadRequestException(
        `No inventory found for variant ${variantId} at location ${locationId}`,
      );
    }

    if (inventory.reserved < quantity) {
      throw new BadRequestException(
        `Cannot fulfill ${quantity} units. Only ${inventory.reserved} units are reserved`,
      );
    }

    // Decrease reserved
    await this.variantInventoryRepository.updateReserved(
      variantId,
      locationId,
      -quantity,
    );

    // Decrease quantity
    const updatedInventory = await this.variantInventoryRepository.updateQuantity(
      variantId,
      locationId,
      -quantity,
    );

    // Record movement
    await this.movementTrackingProvider.recordMovement({
      variantId,
      locationId,
      delta: -quantity,
      reason: 'sale',
      orderId,
    });

    return updatedInventory;
  }

  /**
   * Check if stock can be reserved at a location
   */
  async canReserveStock(
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
   *  Find best location to fulfill order (location with most available stock)
   */
  async findBestLocationForFulfillment(
    variantId: number,
    quantity: number,
  ): Promise<number | null> {
    const inventories = await this.variantInventoryRepository.findByVariantId(variantId);

    let bestLocation: number | null = null;
    let maxAvailable = 0;

    for (const inventory of inventories) {
      const available = inventory.quantity - inventory.reserved;
      if (available >= quantity && available > maxAvailable) {
        maxAvailable = available;
        bestLocation = inventory.locationId;
      }
    }

    return bestLocation;
  }
}

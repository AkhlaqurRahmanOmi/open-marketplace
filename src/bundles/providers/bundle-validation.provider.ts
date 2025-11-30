import { Injectable, BadRequestException } from '@nestjs/common';
import { BundleRepository } from '../repositories';
import { InventoryService } from '../../inventory/inventory.service';

export interface BundleAvailability {
  isAvailable: boolean;
  unavailableItems?: Array<{
    variantId: number;
    variantName: string;
    needed: number;
    available: number;
  }>;
}

@Injectable()
export class BundleValidationProvider {
  constructor(
    private readonly bundleRepository: BundleRepository,
    private readonly inventoryService: InventoryService,
  ) {}

  /**
   * Validate bundle for order (check existence, active status, and inventory)
   */
  async validateBundleForOrder(
    bundleId: number,
    quantity: number,
  ): Promise<void> {
    const bundle: any = await this.bundleRepository.findByIdWithItems(bundleId);

    if (!bundle) {
      throw new BadRequestException(`Bundle with ID ${bundleId} not found`);
    }

    if (!bundle.isActive) {
      throw new BadRequestException(`Bundle with ID ${bundleId} is not active`);
    }

    if (!bundle.bundleItems || bundle.bundleItems.length === 0) {
      throw new BadRequestException(`Bundle with ID ${bundleId} has no items`);
    }

    // Check inventory for each item in bundle
    for (const item of bundle.bundleItems) {
      const neededQuantity = item.quantity * quantity;
      const availableQuantity = await this.inventoryService.getTotalAvailableQuantity(
        item.variantId,
      );

      if (availableQuantity < neededQuantity) {
        throw new BadRequestException(
          `Insufficient inventory for ${item.variant.product?.name || 'variant ' + item.variantId}. ` +
            `Need ${neededQuantity}, have ${availableQuantity}`,
        );
      }
    }
  }

  /**
   * Check bundle availability
   */
  async checkBundleAvailability(
    bundleId: number,
    quantity: number = 1,
  ): Promise<BundleAvailability> {
    const bundle: any = await this.bundleRepository.findByIdWithItems(bundleId);

    if (!bundle || !bundle.isActive) {
      return {
        isAvailable: false,
        unavailableItems: [],
      };
    }

    const unavailableItems: any[] = [];

    for (const item of bundle.bundleItems) {
      const neededQuantity = item.quantity * quantity;
      const availableQuantity = await this.inventoryService.getTotalAvailableQuantity(
        item.variantId,
      );

      if (availableQuantity < neededQuantity) {
        unavailableItems.push({
          variantId: item.variantId,
          variantName: item.variant.product?.name || `Variant ${item.variantId}`,
          needed: neededQuantity,
          available: availableQuantity,
        });
      }
    }

    return {
      isAvailable: unavailableItems.length === 0,
      unavailableItems: unavailableItems.length > 0 ? unavailableItems : undefined,
    };
  }

  /**
   * Reserve inventory for all items in a bundle
   */
  async reserveBundleInventory(
    bundleId: number,
    quantity: number,
    orderId: number,
  ): Promise<void> {
    const bundle: any = await this.bundleRepository.findByIdWithItems(bundleId);

    if (!bundle) {
      throw new BadRequestException(`Bundle with ID ${bundleId} not found`);
    }

    // Reserve inventory for each item in the bundle
    for (const item of bundle.bundleItems) {
      const neededQuantity = item.quantity * quantity;

      // Find best location for fulfillment
      const locationId = await this.inventoryService.findBestLocationForFulfillment(
        item.variantId,
        neededQuantity,
      );

      if (!locationId) {
        throw new BadRequestException(
          `No location found with sufficient inventory for variant ${item.variantId}`,
        );
      }

      // Reserve the stock
      await this.inventoryService.reserveStock({
        variantId: item.variantId,
        locationId: locationId,
        quantity: neededQuantity,
        orderId: orderId,
      });
    }
  }

  /**
   * Release inventory for all items in a bundle
   */
  async releaseBundleInventory(
    bundleId: number,
    quantity: number,
    orderId: number,
  ): Promise<void> {
    const bundle: any = await this.bundleRepository.findByIdWithItems(bundleId);

    if (!bundle) {
      throw new BadRequestException(`Bundle with ID ${bundleId} not found`);
    }

    // Release inventory for each item in the bundle
    for (const item of bundle.bundleItems) {
      const neededQuantity = item.quantity * quantity;

      // Find location where stock was reserved (this would need to be tracked)
      // For now, we'll release from best location
      const locationId = await this.inventoryService.findBestLocationForFulfillment(
        item.variantId,
        neededQuantity,
      );

      if (locationId) {
        await this.inventoryService.releaseStock({
          variantId: item.variantId,
          locationId: locationId,
          quantity: neededQuantity,
          orderId: orderId,
        });
      }
    }
  }
}

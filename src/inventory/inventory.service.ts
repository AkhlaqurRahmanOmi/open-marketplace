import { Injectable } from '@nestjs/common';
import {
  LocationManagementProvider,
  InventoryManagementProvider,
  MovementTrackingProvider,
  StockAllocationProvider,
} from './providers';
import {
  CreateLocationDto,
  UpdateLocationDto,
  AdjustInventoryDto,
  TransferInventoryDto,
  ReserveInventoryDto,
  ReleaseInventoryDto,
  MovementFilterDto,
} from './dtos';

/**
 * InventoryService is a facade that exposes a simplified API
 * while coordinating multiple underlying providers.
 */
@Injectable()
export class InventoryService {
  constructor(
    private readonly locationManagement: LocationManagementProvider,
    private readonly inventoryManagement: InventoryManagementProvider,
    private readonly movementTracking: MovementTrackingProvider,
    private readonly stockAllocation: StockAllocationProvider,
  ) {}

  // ========== Location Management ==========

  createLocation(dto: CreateLocationDto) {
    return this.locationManagement.createLocation(dto);
  }

  updateLocation(id: number, dto: UpdateLocationDto) {
    return this.locationManagement.updateLocation(id, dto);
  }

  deleteLocation(id: number) {
    return this.locationManagement.deleteLocation(id);
  }

  getLocationById(id: number) {
    return this.locationManagement.getLocationById(id);
  }

  getAllLocations() {
    return this.locationManagement.getAllLocations();
  }

  getLocationWithInventory(id: number) {
    return this.locationManagement.getLocationWithInventory(id);
  }

  // ========== Inventory Management ==========

  getInventoryByVariant(variantId: number) {
    return this.inventoryManagement.getInventoryByVariant(variantId);
  }

  getInventoryByLocation(locationId: number) {
    return this.inventoryManagement.getInventoryByLocation(locationId);
  }

  getInventoryByVariantAndLocation(variantId: number, locationId: number) {
    return this.inventoryManagement.getInventoryByVariantAndLocation(variantId, locationId);
  }

  checkAvailability(variantId: number, locationId: number, quantity: number) {
    return this.inventoryManagement.checkAvailability(variantId, locationId, quantity);
  }

  getTotalAvailableQuantity(variantId: number) {
    return this.inventoryManagement.getTotalAvailableQuantity(variantId);
  }

  getTotalQuantity(variantId: number) {
    return this.inventoryManagement.getTotalQuantity(variantId);
  }

  adjustInventory(dto: AdjustInventoryDto) {
    return this.inventoryManagement.adjustInventory(dto);
  }

  transferInventory(dto: TransferInventoryDto) {
    return this.inventoryManagement.transferInventory(dto);
  }

  getAllInventory(filterDto?: {
    page?: number;
    limit?: number;
    variantId?: number;
    locationId?: number;
  }) {
    return this.inventoryManagement.getAllInventory(filterDto);
  }

  getLowStockItems(threshold?: number) {
    return this.inventoryManagement.getLowStockItems(threshold);
  }

  // ========== Movement Tracking ==========

  getMovementsByVariant(variantId: number) {
    return this.movementTracking.getMovementsByVariant(variantId);
  }

  getMovementsByLocation(locationId: number) {
    return this.movementTracking.getMovementsByLocation(locationId);
  }

  getMovementsByOrder(orderId: number) {
    return this.movementTracking.getMovementsByOrder(orderId);
  }

  getMovementsWithFilters(filterDto: MovementFilterDto) {
    return this.movementTracking.getMovementsWithFilters(filterDto);
  }

  getAllMovements() {
    return this.movementTracking.getAllMovements();
  }

  // ========== Stock Allocation ==========

  reserveStock(dto: ReserveInventoryDto) {
    return this.stockAllocation.reserveStock(dto);
  }

  releaseStock(dto: ReleaseInventoryDto) {
    return this.stockAllocation.releaseStock(dto);
  }

  fulfillReservedStock(
    variantId: number,
    locationId: number,
    quantity: number,
    orderId?: number,
  ) {
    return this.stockAllocation.fulfillReservedStock(variantId, locationId, quantity, orderId);
  }

  canReserveStock(variantId: number, locationId: number, quantity: number) {
    return this.stockAllocation.canReserveStock(variantId, locationId, quantity);
  }

  findBestLocationForFulfillment(variantId: number, quantity: number) {
    return this.stockAllocation.findBestLocationForFulfillment(variantId, quantity);
  }
}

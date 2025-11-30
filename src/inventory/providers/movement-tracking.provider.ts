import { Injectable } from '@nestjs/common';
import { InventoryMovement } from '@prisma/client';
import { InventoryMovementRepository } from '../repositories';
import { MovementFilterDto } from '../dtos';
import { PaginatedResult, QueryOptions } from '../../shared/types';

interface RecordMovementDto {
  variantId: number;
  locationId: number;
  delta: number;
  reason: string;
  orderId?: number;
}

@Injectable()
export class MovementTrackingProvider {
  constructor(
    private readonly movementRepository: InventoryMovementRepository,
  ) {}

  /**
   * Record an inventory movement
   */
  async recordMovement(data: RecordMovementDto): Promise<InventoryMovement> {
    return this.movementRepository.create({
      variantId: data.variantId,
      locationId: data.locationId,
      delta: data.delta,
      reason: data.reason,
      orderId: data.orderId,
    });
  }

  /**
   * Get movement history for a variant
   */
  async getMovementsByVariant(variantId: number): Promise<InventoryMovement[]> {
    return this.movementRepository.findByVariantId(variantId);
  }

  /**
   * Get movement history for a location
   */
  async getMovementsByLocation(locationId: number): Promise<InventoryMovement[]> {
    return this.movementRepository.findByLocationId(locationId);
  }

  /**
   * Get movement history for an order
   */
  async getMovementsByOrder(orderId: number): Promise<InventoryMovement[]> {
    return this.movementRepository.findByOrderId(orderId);
  }

  /**
   * Get all movements with filters and pagination
   */
  async getMovementsWithFilters(
    filterDto: MovementFilterDto,
  ): Promise<PaginatedResult<InventoryMovement>> {
    const queryOptions: QueryOptions = {
      filters: {},
      pagination: {
        page: filterDto.page || 1,
        limit: filterDto.limit || 20,
      },
    };

    // Add filters
    if (filterDto.variantId) {
      queryOptions.filters!.variantId = filterDto.variantId;
    }

    if (filterDto.locationId) {
      queryOptions.filters!.locationId = filterDto.locationId;
    }

    if (filterDto.orderId) {
      queryOptions.filters!.orderId = filterDto.orderId;
    }

    if (filterDto.reason) {
      queryOptions.filters!.reason = filterDto.reason;
    }

    return this.movementRepository.findWithFilters(queryOptions);
  }

  /**
   * Get all movements (no pagination)
   */
  async getAllMovements(): Promise<InventoryMovement[]> {
    return this.movementRepository.findAll();
  }
}

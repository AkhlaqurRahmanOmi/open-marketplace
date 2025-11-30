import { Injectable, NotFoundException } from '@nestjs/common';
import { ShippingMethodRepository } from '../repositories';
import { CalculateShippingDto } from '../dtos';

export interface ShippingCalculationResult {
  shippingMethodId: number;
  shippingMethodName: string;
  baseRate: number;
  calculatedRate: number;
  isFree: boolean;
  estimatedDays: {
    min: number;
    max: number;
  };
}

@Injectable()
export class ShippingRateCalculatorProvider {
  constructor(
    private readonly shippingMethodRepository: ShippingMethodRepository,
  ) {}

  /**
   * Calculate shipping rate for a specific shipping method
   */
  async calculateRate(
    dto: CalculateShippingDto,
  ): Promise<ShippingCalculationResult> {
    const method = await this.shippingMethodRepository.findById(
      dto.shippingMethodId,
    );

    if (!method) {
      throw new NotFoundException(
        `Shipping method with ID ${dto.shippingMethodId} not found`,
      );
    }

    if (!method.isActive) {
      throw new NotFoundException(
        `Shipping method ${method.name} is not active`,
      );
    }

    // Check if eligible for free shipping
    const isFree =
      method.freeThreshold !== null &&
      method.freeThreshold !== undefined &&
      dto.subtotal >= method.freeThreshold;

    const calculatedRate = isFree ? 0 : method.baseRate;

    return {
      shippingMethodId: method.id,
      shippingMethodName: method.name,
      baseRate: method.baseRate,
      calculatedRate,
      isFree,
      estimatedDays: {
        min: method.minDays,
        max: method.maxDays,
      },
    };
  }

  /**
   * Calculate shipping rates for all active methods
   */
  async calculateAllRates(
    subtotal: number,
    weight?: number,
  ): Promise<ShippingCalculationResult[]> {
    const activeMethods = await this.shippingMethodRepository.findActive();

    return Promise.all(
      activeMethods.map((method) =>
        this.calculateRate({
          shippingMethodId: method.id,
          subtotal,
          weight,
        }),
      ),
    );
  }

  /**
   * Get cheapest shipping option
   */
  async getCheapestOption(
    subtotal: number,
    weight?: number,
  ): Promise<ShippingCalculationResult> {
    const allRates = await this.calculateAllRates(subtotal, weight);

    if (allRates.length === 0) {
      throw new NotFoundException('No active shipping methods available');
    }

    // Sort by calculated rate (ascending)
    allRates.sort((a, b) => a.calculatedRate - b.calculatedRate);

    return allRates[0];
  }

  /**
   * Get fastest shipping option
   */
  async getFastestOption(
    subtotal: number,
    weight?: number,
  ): Promise<ShippingCalculationResult> {
    const allRates = await this.calculateAllRates(subtotal, weight);

    if (allRates.length === 0) {
      throw new NotFoundException('No active shipping methods available');
    }

    // Sort by max days (ascending)
    allRates.sort((a, b) => a.estimatedDays.max - b.estimatedDays.max);

    return allRates[0];
  }
}

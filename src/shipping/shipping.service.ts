import { Injectable } from '@nestjs/common';
import { ShippingMethod } from '@prisma/client';
import {
  ShippingManagementProvider,
  ShippingRateCalculatorProvider,
} from './providers';
import {
  CreateShippingMethodDto,
  UpdateShippingMethodDto,
  ShippingFilterDto,
  CalculateShippingDto,
} from './dtos';
import { PaginatedResult } from '../shared/types';
import { ShippingCalculationResult } from './providers/shipping-rate-calculator.provider';

@Injectable()
export class ShippingService {
  constructor(
    private readonly managementProvider: ShippingManagementProvider,
    private readonly rateCalculatorProvider: ShippingRateCalculatorProvider,
  ) {}

  // Management operations
  async createShippingMethod(
    dto: CreateShippingMethodDto,
  ): Promise<ShippingMethod> {
    return this.managementProvider.createShippingMethod(dto);
  }

  async updateShippingMethod(
    id: number,
    dto: UpdateShippingMethodDto,
  ): Promise<ShippingMethod> {
    return this.managementProvider.updateShippingMethod(id, dto);
  }

  async deleteShippingMethod(id: number): Promise<void> {
    return this.managementProvider.deleteShippingMethod(id);
  }

  async getShippingMethodById(id: number): Promise<ShippingMethod> {
    return this.managementProvider.getShippingMethodById(id);
  }

  async getAllShippingMethods(
    filterDto: ShippingFilterDto,
  ): Promise<PaginatedResult<ShippingMethod>> {
    return this.managementProvider.getAllShippingMethods(filterDto);
  }

  async getActiveShippingMethods(): Promise<ShippingMethod[]> {
    return this.managementProvider.getActiveShippingMethods();
  }

  async toggleActive(id: number): Promise<ShippingMethod> {
    return this.managementProvider.toggleActive(id);
  }

  // Rate calculation operations
  async calculateRate(
    dto: CalculateShippingDto,
  ): Promise<ShippingCalculationResult> {
    return this.rateCalculatorProvider.calculateRate(dto);
  }

  async calculateAllRates(
    subtotal: number,
    weight?: number,
  ): Promise<ShippingCalculationResult[]> {
    return this.rateCalculatorProvider.calculateAllRates(subtotal, weight);
  }

  async getCheapestOption(
    subtotal: number,
    weight?: number,
  ): Promise<ShippingCalculationResult> {
    return this.rateCalculatorProvider.getCheapestOption(subtotal, weight);
  }

  async getFastestOption(
    subtotal: number,
    weight?: number,
  ): Promise<ShippingCalculationResult> {
    return this.rateCalculatorProvider.getFastestOption(subtotal, weight);
  }
}

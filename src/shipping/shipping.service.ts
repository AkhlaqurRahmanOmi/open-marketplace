import { Injectable } from '@nestjs/common';
import { ShippingMethod, Shipment, ShipmentStatus } from '@prisma/client';
import {
  ShippingManagementProvider,
  ShippingRateCalculatorProvider,
} from './providers';
import { ShipmentManagementProvider } from './providers/shipment-management.provider';
import {
  CreateShippingMethodDto,
  UpdateShippingMethodDto,
  ShippingFilterDto,
  CalculateShippingDto,
  CreateShipmentDto,
  UpdateShipmentDto,
  ShipmentFilterDto,
} from './dtos';
import { PaginatedResult } from '../shared/types';
import { ShippingCalculationResult } from './providers/shipping-rate-calculator.provider';

@Injectable()
export class ShippingService {
  constructor(
    private readonly managementProvider: ShippingManagementProvider,
    private readonly rateCalculatorProvider: ShippingRateCalculatorProvider,
    private readonly shipmentManagementProvider: ShipmentManagementProvider,
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

  // Shipment operations (Phase 8: Multi-vendor)

  async createShipment(dto: CreateShipmentDto): Promise<Shipment> {
    return this.shipmentManagementProvider.createShipment(dto);
  }

  async getShipmentById(id: number, organizationId?: number): Promise<Shipment> {
    return this.shipmentManagementProvider.getShipmentById(id, organizationId);
  }

  async updateShipment(
    id: number,
    dto: UpdateShipmentDto,
    organizationId?: number,
  ): Promise<Shipment> {
    return this.shipmentManagementProvider.updateShipment(id, dto, organizationId);
  }

  async getOrganizationShipments(
    organizationId: number,
    filterDto?: ShipmentFilterDto,
  ): Promise<any> {
    return this.shipmentManagementProvider.getOrganizationShipments(
      organizationId,
      filterDto,
    );
  }

  async getOrderShipments(orderId: number): Promise<Shipment[]> {
    return this.shipmentManagementProvider.getOrderShipments(orderId);
  }

  async markShipmentAsShipped(
    id: number,
    trackingNumber?: string,
    organizationId?: number,
  ): Promise<Shipment> {
    return this.shipmentManagementProvider.markAsShipped(
      id,
      trackingNumber,
      organizationId,
    );
  }

  async markShipmentAsDelivered(
    id: number,
    organizationId?: number,
  ): Promise<Shipment> {
    return this.shipmentManagementProvider.markAsDelivered(id, organizationId);
  }

  async getShipmentsByStatus(
    organizationId: number,
    status: ShipmentStatus,
  ): Promise<Shipment[]> {
    return this.shipmentManagementProvider.getShipmentsByStatus(
      organizationId,
      status,
    );
  }

  async autoCreateShipmentsForOrder(orderId: number): Promise<Shipment[]> {
    return this.shipmentManagementProvider.autoCreateShipmentsForOrder(orderId);
  }
}

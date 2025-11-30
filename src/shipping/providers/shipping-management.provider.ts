import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ShippingMethod } from '@prisma/client';
import { ShippingMethodRepository } from '../repositories';
import {
  CreateShippingMethodDto,
  UpdateShippingMethodDto,
  ShippingFilterDto,
} from '../dtos';
import { PaginatedResult, QueryOptions } from '../../shared/types';

@Injectable()
export class ShippingManagementProvider {
  constructor(
    private readonly shippingMethodRepository: ShippingMethodRepository,
  ) {}

  /**
   * Create a new shipping method
   */
  async createShippingMethod(
    dto: CreateShippingMethodDto,
  ): Promise<ShippingMethod> {
    // Check if code already exists
    const existingMethod = await this.shippingMethodRepository.findByCode(
      dto.code,
    );

    if (existingMethod) {
      throw new ConflictException(
        `Shipping method with code ${dto.code} already exists`,
      );
    }

    return this.shippingMethodRepository.create({
      name: dto.name,
      code: dto.code,
      type: dto.type,
      description: dto.description,
      baseRate: dto.baseRate,
      freeThreshold: dto.freeThreshold,
      minDays: dto.minDays,
      maxDays: dto.maxDays,
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? 0,
    });
  }

  /**
   * Update an existing shipping method
   */
  async updateShippingMethod(
    id: number,
    dto: UpdateShippingMethodDto,
  ): Promise<ShippingMethod> {
    const method = await this.shippingMethodRepository.findById(id);

    if (!method) {
      throw new NotFoundException(`Shipping method with ID ${id} not found`);
    }

    // If updating code, check for duplicates
    if (dto.code && dto.code !== method.code) {
      const existingMethod = await this.shippingMethodRepository.findByCode(
        dto.code,
      );

      if (existingMethod) {
        throw new ConflictException(
          `Shipping method with code ${dto.code} already exists`,
        );
      }
    }

    return this.shippingMethodRepository.update(id, dto);
  }

  /**
   * Delete a shipping method
   */
  async deleteShippingMethod(id: number): Promise<void> {
    const method = await this.shippingMethodRepository.findById(id);

    if (!method) {
      throw new NotFoundException(`Shipping method with ID ${id} not found`);
    }

    await this.shippingMethodRepository.delete(id);
  }

  /**
   * Get a shipping method by ID
   */
  async getShippingMethodById(id: number): Promise<ShippingMethod> {
    const method = await this.shippingMethodRepository.findById(id);

    if (!method) {
      throw new NotFoundException(`Shipping method with ID ${id} not found`);
    }

    return method;
  }

  /**
   * Get all shipping methods with filters
   */
  async getAllShippingMethods(
    filterDto: ShippingFilterDto,
  ): Promise<PaginatedResult<ShippingMethod>> {
    const filters: any = {};

    if (filterDto.isActive !== undefined) {
      filters.isActive = filterDto.isActive;
    }

    if (filterDto.type) {
      filters.type = filterDto.type;
    }

    const queryOptions: QueryOptions = {
      filters,
      pagination: {
        page: filterDto.page || 1,
        limit: filterDto.limit || 10,
      },
      sort: filterDto.sortBy
        ? {
            field: filterDto.sortBy,
            order: (filterDto.sortOrder as 'asc' | 'desc') || 'asc',
          }
        : { field: 'sortOrder', order: 'asc' },
    };

    return this.shippingMethodRepository.findWithFilters(queryOptions);
  }

  /**
   * Get all active shipping methods
   */
  async getActiveShippingMethods(): Promise<ShippingMethod[]> {
    return this.shippingMethodRepository.findActive();
  }

  /**
   * Toggle active status
   */
  async toggleActive(id: number): Promise<ShippingMethod> {
    const method = await this.shippingMethodRepository.findById(id);

    if (!method) {
      throw new NotFoundException(`Shipping method with ID ${id} not found`);
    }

    return this.shippingMethodRepository.update(id, {
      isActive: !method.isActive,
    });
  }
}

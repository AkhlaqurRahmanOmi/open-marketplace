import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Variant } from '@prisma/client';
import { VariantRepository } from '../repositories';
import { CreateVariantDto, UpdateVariantDto } from '../dtos';
import { PrismaService } from '../../core/config/prisma/prisma.service';

@Injectable()
export class VariantManagementProvider {
  constructor(
    private readonly variantRepository: VariantRepository,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Create a new variant
   */
  async createVariant(createVariantDto: CreateVariantDto): Promise<Variant> {
    // Check if product exists
    const product = await this.prisma.product.findUnique({
      where: { id: createVariantDto.productId },
    });
    if (!product) {
      throw new NotFoundException(
        `Product with ID ${createVariantDto.productId} not found`,
      );
    }

    // Check if SKU already exists
    const existingVariant = await this.variantRepository.findBySku(
      createVariantDto.sku,
    );
    if (existingVariant) {
      throw new ConflictException(
        `Variant with SKU '${createVariantDto.sku}' already exists`,
      );
    }

    return this.variantRepository.create(createVariantDto);
  }

  /**
   * Update an existing variant
   */
  async updateVariant(
    id: number,
    updateVariantDto: UpdateVariantDto,
  ): Promise<Variant> {
    const variant = await this.variantRepository.findById(id);
    if (!variant) {
      throw new NotFoundException(`Variant with ID ${id} not found`);
    }

    // Check SKU uniqueness if being updated
    if (updateVariantDto.sku && updateVariantDto.sku !== variant.sku) {
      const existingVariant = await this.variantRepository.findBySku(
        updateVariantDto.sku,
      );
      if (existingVariant && existingVariant.id !== id) {
        throw new ConflictException(
          `Variant with SKU '${updateVariantDto.sku}' already exists`,
        );
      }
    }

    return this.variantRepository.update(id, updateVariantDto);
  }

  /**
   * Delete a variant
   */
  async deleteVariant(id: number): Promise<void> {
    const variant = await this.variantRepository.findById(id);
    if (!variant) {
      throw new NotFoundException(`Variant with ID ${id} not found`);
    }

    // Check if variant has inventory
    const inventory = await this.prisma.variantInventory.findFirst({
      where: {
        variantId: id,
        quantity: {
          gt: 0,
        },
      },
    });

    if (inventory) {
      throw new BadRequestException(
        'Cannot delete variant with existing inventory. Please adjust inventory first.',
      );
    }

    await this.variantRepository.delete(id);
  }

  /**
   * Get a single variant by ID
   */
  async getVariantById(id: number): Promise<Variant> {
    const variant = await this.variantRepository.findById(id);
    if (!variant) {
      throw new NotFoundException(`Variant with ID ${id} not found`);
    }

    return variant;
  }

  /**
   * Get a single variant by SKU
   */
  async getVariantBySku(sku: string): Promise<Variant> {
    const variant = await this.variantRepository.findBySku(sku);
    if (!variant) {
      throw new NotFoundException(`Variant with SKU '${sku}' not found`);
    }

    return variant;
  }

  /**
   * Get all variants for a product
   */
  async getVariantsByProductId(productId: number): Promise<Variant[]> {
    // Check if product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    return this.variantRepository.findByProductId(productId);
  }

  /**
   * Get all active variants
   */
  async getActiveVariants(productId?: number): Promise<Variant[]> {
    return this.variantRepository.findActiveVariants(productId);
  }

  /**
   * Link option value to variant
   */
  async linkOptionValue(
    variantId: number,
    optionId: number,
    optionValueId: number,
  ): Promise<void> {
    // Verify variant exists
    const variant = await this.variantRepository.findById(variantId);
    if (!variant) {
      throw new NotFoundException(`Variant with ID ${variantId} not found`);
    }

    // Verify option exists and belongs to the variant's product
    const option = await this.prisma.productOption.findFirst({
      where: {
        id: optionId,
        productId: variant.productId,
      },
    });
    if (!option) {
      throw new NotFoundException(
        `Product option with ID ${optionId} not found for this product`,
      );
    }

    // Verify option value exists and belongs to the option
    const optionValue = await this.prisma.optionValue.findFirst({
      where: {
        id: optionValueId,
        optionId,
      },
    });
    if (!optionValue) {
      throw new NotFoundException(
        `Option value with ID ${optionValueId} not found for this option`,
      );
    }

    // Check if already linked
    const existingLink = await this.prisma.variantOptionValue.findUnique({
      where: {
        variantId_optionId_optionValueId: {
          variantId,
          optionId,
          optionValueId,
        },
      },
    });

    if (existingLink) {
      throw new ConflictException(
        'This option value is already linked to the variant',
      );
    }

    await this.variantRepository.linkOptionValue(
      variantId,
      optionId,
      optionValueId,
    );
  }

  /**
   * Unlink option value from variant
   */
  async unlinkOptionValue(
    variantId: number,
    optionId: number,
    optionValueId: number,
  ): Promise<void> {
    const existingLink = await this.prisma.variantOptionValue.findUnique({
      where: {
        variantId_optionId_optionValueId: {
          variantId,
          optionId,
          optionValueId,
        },
      },
    });

    if (!existingLink) {
      throw new NotFoundException(
        'This option value is not linked to the variant',
      );
    }

    await this.variantRepository.unlinkOptionValue(
      variantId,
      optionId,
      optionValueId,
    );
  }

  /**
   * Update variant inventory (for Inventory module integration)
   */
  async updateInventory(
    variantId: number,
    locationId: number,
    quantity: number,
  ): Promise<void> {
    // Verify variant exists
    const variant = await this.variantRepository.findById(variantId);
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

    // Update or create inventory
    await this.prisma.variantInventory.upsert({
      where: {
        variantId_locationId: {
          variantId,
          locationId,
        },
      },
      update: {
        quantity,
        updatedAt: new Date(),
      },
      create: {
        variantId,
        locationId,
        quantity,
      },
    });
  }

  /**
   * Get variant inventory across all locations
   */
  async getVariantInventory(variantId: number) {
    const variant = await this.variantRepository.findById(variantId);
    if (!variant) {
      throw new NotFoundException(`Variant with ID ${variantId} not found`);
    }

    const inventories = await this.prisma.variantInventory.findMany({
      where: { variantId },
      include: {
        location: true,
      },
    });

    const totalQuantity = inventories.reduce(
      (sum, inv) => sum + inv.quantity,
      0,
    );
    const totalReserved = inventories.reduce(
      (sum, inv) => sum + inv.reserved,
      0,
    );

    return {
      variantId,
      sku: variant.sku,
      totalQuantity,
      totalReserved,
      availableQuantity: totalQuantity - totalReserved,
      inventories,
    };
  }
}

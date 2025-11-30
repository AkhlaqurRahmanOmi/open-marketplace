import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ProductOption, OptionValue } from '@prisma/client';
import { PrismaService } from '../../core/config/prisma/prisma.service';
import { CreateProductOptionDto, CreateOptionValueDto } from '../dtos';

@Injectable()
export class OptionManagementProvider {
  constructor(private readonly prisma: PrismaService) {}

  // ============ Product Options ============

  /**
   * Create a product option (e.g., "Size", "Color")
   */
  async createProductOption(
    createOptionDto: CreateProductOptionDto,
  ): Promise<ProductOption> {
    // Verify product exists
    const product = await this.prisma.product.findUnique({
      where: { id: createOptionDto.productId },
    });
    if (!product) {
      throw new NotFoundException(
        `Product with ID ${createOptionDto.productId} not found`,
      );
    }

    // Check if option with same name already exists for this product
    const existingOption = await this.prisma.productOption.findFirst({
      where: {
        productId: createOptionDto.productId,
        name: createOptionDto.name,
      },
    });

    if (existingOption) {
      throw new BadRequestException(
        `Option '${createOptionDto.name}' already exists for this product`,
      );
    }

    return this.prisma.productOption.create({
      data: {
        productId: createOptionDto.productId,
        name: createOptionDto.name,
        position: createOptionDto.position || 1,
      },
      include: {
        optionValues: true,
      },
    });
  }

  /**
   * Get all options for a product
   */
  async getProductOptions(productId: number): Promise<ProductOption[]> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    return this.prisma.productOption.findMany({
      where: { productId },
      include: {
        optionValues: {
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { position: 'asc' },
    });
  }

  /**
   * Get a single product option by ID
   */
  async getProductOptionById(optionId: number): Promise<ProductOption> {
    const option = await this.prisma.productOption.findUnique({
      where: { id: optionId },
      include: {
        optionValues: {
          orderBy: { position: 'asc' },
        },
        product: true,
      },
    });

    if (!option) {
      throw new NotFoundException(`Product option with ID ${optionId} not found`);
    }

    return option;
  }

  /**
   * Update a product option
   */
  async updateProductOption(
    optionId: number,
    updateData: Partial<ProductOption>,
  ): Promise<ProductOption> {
    const option = await this.prisma.productOption.findUnique({
      where: { id: optionId },
    });
    if (!option) {
      throw new NotFoundException(`Product option with ID ${optionId} not found`);
    }

    // Check name uniqueness if being updated
    if (updateData.name && updateData.name !== option.name) {
      const existingOption = await this.prisma.productOption.findFirst({
        where: {
          productId: option.productId,
          name: updateData.name,
          id: { not: optionId },
        },
      });

      if (existingOption) {
        throw new BadRequestException(
          `Option '${updateData.name}' already exists for this product`,
        );
      }
    }

    return this.prisma.productOption.update({
      where: { id: optionId },
      data: updateData,
      include: {
        optionValues: {
          orderBy: { position: 'asc' },
        },
      },
    });
  }

  /**
   * Delete a product option
   */
  async deleteProductOption(optionId: number): Promise<void> {
    const option = await this.prisma.productOption.findUnique({
      where: { id: optionId },
      include: {
        variantOptionValues: true,
      },
    });

    if (!option) {
      throw new NotFoundException(`Product option with ID ${optionId} not found`);
    }

    // Check if option is used by any variants
    if (option.variantOptionValues.length > 0) {
      throw new BadRequestException(
        'Cannot delete option that is used by variants. Please remove variant associations first.',
      );
    }

    await this.prisma.productOption.delete({
      where: { id: optionId },
    });
  }

  // ============ Option Values ============

  /**
   * Create an option value (e.g., "Large", "Red")
   */
  async createOptionValue(
    createValueDto: CreateOptionValueDto,
  ): Promise<OptionValue> {
    // Verify option exists
    const option = await this.prisma.productOption.findUnique({
      where: { id: createValueDto.optionId },
    });
    if (!option) {
      throw new NotFoundException(
        `Product option with ID ${createValueDto.optionId} not found`,
      );
    }

    // Check if value already exists for this option
    const existingValue = await this.prisma.optionValue.findFirst({
      where: {
        optionId: createValueDto.optionId,
        value: createValueDto.value,
      },
    });

    if (existingValue) {
      throw new BadRequestException(
        `Value '${createValueDto.value}' already exists for this option`,
      );
    }

    return this.prisma.optionValue.create({
      data: {
        optionId: createValueDto.optionId,
        value: createValueDto.value,
        position: createValueDto.position || 1,
      },
      include: {
        productOption: true,
      },
    });
  }

  /**
   * Get all values for an option
   */
  async getOptionValues(optionId: number): Promise<OptionValue[]> {
    const option = await this.prisma.productOption.findUnique({
      where: { id: optionId },
    });
    if (!option) {
      throw new NotFoundException(`Product option with ID ${optionId} not found`);
    }

    return this.prisma.optionValue.findMany({
      where: { optionId },
      orderBy: { position: 'asc' },
    });
  }

  /**
   * Get a single option value by ID
   */
  async getOptionValueById(valueId: number): Promise<OptionValue> {
    const value = await this.prisma.optionValue.findUnique({
      where: { id: valueId },
      include: {
        productOption: true,
      },
    });

    if (!value) {
      throw new NotFoundException(`Option value with ID ${valueId} not found`);
    }

    return value;
  }

  /**
   * Update an option value
   */
  async updateOptionValue(
    valueId: number,
    updateData: Partial<OptionValue>,
  ): Promise<OptionValue> {
    const value = await this.prisma.optionValue.findUnique({
      where: { id: valueId },
    });
    if (!value) {
      throw new NotFoundException(`Option value with ID ${valueId} not found`);
    }

    // Check value uniqueness if being updated
    if (updateData.value && updateData.value !== value.value) {
      const existingValue = await this.prisma.optionValue.findFirst({
        where: {
          optionId: value.optionId,
          value: updateData.value,
          id: { not: valueId },
        },
      });

      if (existingValue) {
        throw new BadRequestException(
          `Value '${updateData.value}' already exists for this option`,
        );
      }
    }

    return this.prisma.optionValue.update({
      where: { id: valueId },
      data: updateData,
      include: {
        productOption: true,
      },
    });
  }

  /**
   * Delete an option value
   */
  async deleteOptionValue(valueId: number): Promise<void> {
    const value = await this.prisma.optionValue.findUnique({
      where: { id: valueId },
      include: {
        variantOptionValues: true,
      },
    });

    if (!value) {
      throw new NotFoundException(`Option value with ID ${valueId} not found`);
    }

    // Check if value is used by any variants
    if (value.variantOptionValues.length > 0) {
      throw new BadRequestException(
        'Cannot delete option value that is used by variants. Please remove variant associations first.',
      );
    }

    await this.prisma.optionValue.delete({
      where: { id: valueId },
    });
  }

  /**
   * Reorder option values
   */
  async reorderOptionValues(
    optionId: number,
    valueIds: number[],
  ): Promise<OptionValue[]> {
    const option = await this.prisma.productOption.findUnique({
      where: { id: optionId },
    });
    if (!option) {
      throw new NotFoundException(`Product option with ID ${optionId} not found`);
    }

    // Verify all value IDs belong to this option
    const values = await this.prisma.optionValue.findMany({
      where: {
        id: { in: valueIds },
        optionId,
      },
    });

    if (values.length !== valueIds.length) {
      throw new BadRequestException(
        'Some value IDs do not belong to this option',
      );
    }

    // Update positions
    const updatePromises = valueIds.map((valueId, index) =>
      this.prisma.optionValue.update({
        where: { id: valueId },
        data: { position: index + 1 },
      }),
    );

    await Promise.all(updatePromises);

    return this.prisma.optionValue.findMany({
      where: { optionId },
      orderBy: { position: 'asc' },
    });
  }
}

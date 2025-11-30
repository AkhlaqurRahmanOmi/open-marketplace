import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ProductImage, VariantImage } from '@prisma/client';
import { PrismaService } from '../../core/config/prisma/prisma.service';
import { CreateProductImageDto, CreateVariantImageDto } from '../dtos';

@Injectable()
export class ImageManagementProvider {
  constructor(private readonly prisma: PrismaService) {}

  // ============ Product Images ============

  /**
   * Add an image to a product
   */
  async addProductImage(
    createImageDto: CreateProductImageDto,
  ): Promise<ProductImage> {
    // Verify product exists
    const product = await this.prisma.product.findUnique({
      where: { id: createImageDto.productId },
    });
    if (!product) {
      throw new NotFoundException(
        `Product with ID ${createImageDto.productId} not found`,
      );
    }

    // If this is set as main image, unset other main images
    if (createImageDto.isMain) {
      await this.prisma.productImage.updateMany({
        where: {
          productId: createImageDto.productId,
          isMain: true,
        },
        data: {
          isMain: false,
        },
      });
    }

    return this.prisma.productImage.create({
      data: {
        productId: createImageDto.productId,
        imageUrl: createImageDto.imageUrl,
        altText: createImageDto.altText,
        position: createImageDto.position || 1,
        isMain: createImageDto.isMain || false,
      },
    });
  }

  /**
   * Get all images for a product
   */
  async getProductImages(productId: number): Promise<ProductImage[]> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    return this.prisma.productImage.findMany({
      where: { productId },
      orderBy: [{ isMain: 'desc' }, { position: 'asc' }],
    });
  }

  /**
   * Update product image
   */
  async updateProductImage(
    imageId: number,
    updateData: Partial<ProductImage>,
  ): Promise<ProductImage> {
    const image = await this.prisma.productImage.findUnique({
      where: { id: imageId },
    });
    if (!image) {
      throw new NotFoundException(`Product image with ID ${imageId} not found`);
    }

    // If setting as main, unset other main images
    if (updateData.isMain) {
      await this.prisma.productImage.updateMany({
        where: {
          productId: image.productId,
          isMain: true,
          id: { not: imageId },
        },
        data: {
          isMain: false,
        },
      });
    }

    return this.prisma.productImage.update({
      where: { id: imageId },
      data: updateData,
    });
  }

  /**
   * Delete a product image
   */
  async deleteProductImage(imageId: number): Promise<void> {
    const image = await this.prisma.productImage.findUnique({
      where: { id: imageId },
    });
    if (!image) {
      throw new NotFoundException(`Product image with ID ${imageId} not found`);
    }

    await this.prisma.productImage.delete({
      where: { id: imageId },
    });
  }

  /**
   * Set an image as the main product image
   */
  async setPrimaryProductImage(
    productId: number,
    imageId: number,
  ): Promise<ProductImage> {
    const image = await this.prisma.productImage.findFirst({
      where: {
        id: imageId,
        productId,
      },
    });

    if (!image) {
      throw new NotFoundException(
        `Image with ID ${imageId} not found for product ${productId}`,
      );
    }

    // Unset all main images for this product
    await this.prisma.productImage.updateMany({
      where: {
        productId,
        isMain: true,
      },
      data: {
        isMain: false,
      },
    });

    // Set this image as main
    return this.prisma.productImage.update({
      where: { id: imageId },
      data: { isMain: true },
    });
  }

  /**
   * Reorder product images
   */
  async reorderProductImages(
    productId: number,
    imageIds: number[],
  ): Promise<ProductImage[]> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // Verify all image IDs belong to this product
    const images = await this.prisma.productImage.findMany({
      where: {
        id: { in: imageIds },
        productId,
      },
    });

    if (images.length !== imageIds.length) {
      throw new BadRequestException(
        'Some image IDs do not belong to this product',
      );
    }

    // Update positions
    const updatePromises = imageIds.map((imageId, index) =>
      this.prisma.productImage.update({
        where: { id: imageId },
        data: { position: index + 1 },
      }),
    );

    await Promise.all(updatePromises);

    return this.prisma.productImage.findMany({
      where: { productId },
      orderBy: [{ isMain: 'desc' }, { position: 'asc' }],
    });
  }

  // ============ Variant Images ============

  /**
   * Add an image to a variant
   */
  async addVariantImage(
    createImageDto: CreateVariantImageDto,
  ): Promise<VariantImage> {
    // Verify variant exists
    const variant = await this.prisma.variant.findUnique({
      where: { id: createImageDto.variantId },
    });
    if (!variant) {
      throw new NotFoundException(
        `Variant with ID ${createImageDto.variantId} not found`,
      );
    }

    return this.prisma.variantImage.create({
      data: {
        variantId: createImageDto.variantId,
        imageUrl: createImageDto.imageUrl,
        altText: createImageDto.altText,
        position: createImageDto.position || 1,
      },
    });
  }

  /**
   * Get all images for a variant
   */
  async getVariantImages(variantId: number): Promise<VariantImage[]> {
    const variant = await this.prisma.variant.findUnique({
      where: { id: variantId },
    });
    if (!variant) {
      throw new NotFoundException(`Variant with ID ${variantId} not found`);
    }

    return this.prisma.variantImage.findMany({
      where: { variantId },
      orderBy: { position: 'asc' },
    });
  }

  /**
   * Update variant image
   */
  async updateVariantImage(
    imageId: number,
    updateData: Partial<VariantImage>,
  ): Promise<VariantImage> {
    const image = await this.prisma.variantImage.findUnique({
      where: { id: imageId },
    });
    if (!image) {
      throw new NotFoundException(`Variant image with ID ${imageId} not found`);
    }

    return this.prisma.variantImage.update({
      where: { id: imageId },
      data: updateData,
    });
  }

  /**
   * Delete a variant image
   */
  async deleteVariantImage(imageId: number): Promise<void> {
    const image = await this.prisma.variantImage.findUnique({
      where: { id: imageId },
    });
    if (!image) {
      throw new NotFoundException(`Variant image with ID ${imageId} not found`);
    }

    await this.prisma.variantImage.delete({
      where: { id: imageId },
    });
  }

  /**
   * Reorder variant images
   */
  async reorderVariantImages(
    variantId: number,
    imageIds: number[],
  ): Promise<VariantImage[]> {
    const variant = await this.prisma.variant.findUnique({
      where: { id: variantId },
    });
    if (!variant) {
      throw new NotFoundException(`Variant with ID ${variantId} not found`);
    }

    // Verify all image IDs belong to this variant
    const images = await this.prisma.variantImage.findMany({
      where: {
        id: { in: imageIds },
        variantId,
      },
    });

    if (images.length !== imageIds.length) {
      throw new BadRequestException(
        'Some image IDs do not belong to this variant',
      );
    }

    // Update positions
    const updatePromises = imageIds.map((imageId, index) =>
      this.prisma.variantImage.update({
        where: { id: imageId },
        data: { position: index + 1 },
      }),
    );

    await Promise.all(updatePromises);

    return this.prisma.variantImage.findMany({
      where: { variantId },
      orderBy: { position: 'asc' },
    });
  }
}

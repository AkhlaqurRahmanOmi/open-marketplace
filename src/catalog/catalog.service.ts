import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  ProductManagementProvider,
  VariantManagementProvider,
  CategoryManagementProvider,
  ImageManagementProvider,
  OptionManagementProvider,
  WishlistManagementProvider,
} from './providers';
import {
  CreateProductDto,
  UpdateProductDto,
  CreateVariantDto,
  UpdateVariantDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateProductImageDto,
  CreateVariantImageDto,
  CreateProductOptionDto,
  CreateOptionValueDto,
  ProductFilterDto,
  CreateCompleteProductDto,
  AddToWishlistDto
} from './dtos';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { MonitorClass } from '../shared/decorators/performance-monitor.decorator';
import { UnitOfWorkService } from '../shared/services/unit-of-work.service';
import { CommissionCalculatorProvider } from '../orders/providers/commission-calculator.provider';
import { PrismaService } from '../core/config/prisma/prisma.service';

/**
 * CatalogService is a facade that exposes a simplified API
 * while coordinating multiple underlying providers.
 */

@MonitorClass(500)
@Injectable()
export class CatalogService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly productManagement: ProductManagementProvider,
    private readonly variantManagement: VariantManagementProvider,
    private readonly categoryManagement: CategoryManagementProvider,
    private readonly imageManagement: ImageManagementProvider,
    private readonly optionManagement: OptionManagementProvider,
    private readonly wishlistManagement : WishlistManagementProvider,
    private readonly unitOfWork : UnitOfWorkService,
    private readonly commissionCalculator: CommissionCalculatorProvider,
    private readonly prisma: PrismaService,
  ) {}

  // ---------- Read APIs (pass-through) ----------

  // Public catalog view
  getProducts(filter: ProductFilterDto) {
    return this.productManagement.getAllProducts(filter);
  }

  getProductById(id: number) {
    return this.productManagement.getProductById(id);
  }

  // ---------- Organization-Scoped APIs (for vendors) ----------

  getProductsForOrganization(filter: ProductFilterDto, organizationId: number) {
    return this.productManagement.getAllProductsForOrganization(filter, organizationId);
  }

  getProductByIdForOrganization(id: number, organizationId: number) {
    return this.productManagement.getProductByIdForOrganization(id, organizationId);
  }

  getProductVariants(productId: number) {
    return this.variantManagement.getVariantsByProductId(productId);
  }

  getVariantById(id: number) {
    return this.variantManagement.getVariantById(id);
  }

  getVariantInventory(variantId: number) {
    return this.variantManagement.getVariantInventory(variantId);
  }

  getCategories() {
    return this.categoryManagement.getCategoryTree();
  }

  getCategoryById(id: number) {
    return this.categoryManagement.getCategoryById(id);
  }

  getCategoryProducts(categoryId: number) {
    return this.productManagement.getProductsByCategory(categoryId);
  }

  getProductImages(productId: number) {
    return this.imageManagement.getProductImages(productId);
  }

  getProductOptions(productId: number) {
    return this.optionManagement.getProductOptions(productId);
  }

  searchProducts(q: string, filters: ProductFilterDto) {
    return this.productManagement.searchProducts(q, filters);
  }

  // ---------- Write APIs (pass-through) ----------

  createProduct(dto: CreateProductDto) {
    return this.productManagement.createProduct(dto);
  }

  createProductForOrganization(dto: CreateProductDto, organizationId: number) {
    return this.productManagement.createProductForOrganization(dto, organizationId);
  }

  updateProduct(id: number, dto: UpdateProductDto) {
    return this.productManagement.updateProduct(id, dto);
  }

  updateProductForOrganization(id: number, dto: UpdateProductDto, organizationId: number) {
    return this.productManagement.updateProductForOrganization(id, dto, organizationId);
  }

  async deleteProduct(id: number) {
    // Optional guard
    const existing = await this.productManagement.getProductById(id);
    if (!existing) throw new NotFoundException(`Product ${id} not found`);
    return this.productManagement.deleteProduct(id);
  }

  async deleteProductForOrganization(id: number, organizationId: number) {
    const existing = await this.productManagement.getProductByIdForOrganization(id, organizationId);
    if (!existing) throw new NotFoundException(`Product ${id} not found for your organization`);
    return this.productManagement.deleteProductForOrganization(id, organizationId);
  }

  publishProduct(id: number) {
    return this.productManagement.publishProduct(id);
  }

  publishProductForOrganization(id: number, organizationId: number) {
    return this.productManagement.publishProductForOrganization(id, organizationId);
  }

  unpublishProduct(id: number) {
    return this.productManagement.unpublishProduct(id);
  }

  unpublishProductForOrganization(id: number, organizationId: number) {
    return this.productManagement.unpublishProductForOrganization(id, organizationId);
  }

  createVariant(dto: CreateVariantDto) {
    return this.variantManagement.createVariant(dto);
  }

  updateVariant(id: number, dto: UpdateVariantDto) {
    return this.variantManagement.updateVariant(id, dto);
  }

  async deleteVariant(id: number) {
    const existing = await this.variantManagement.getVariantById(id);
    if (!existing) throw new NotFoundException(`Variant ${id} not found`);
    return this.variantManagement.deleteVariant(id);
  }

  createCategory(dto: CreateCategoryDto) {
    return this.categoryManagement.createCategory(dto);
  }

  updateCategory(id: number, dto: UpdateCategoryDto) {
    return this.categoryManagement.updateCategory(id, dto);
  }

  async deleteCategory(id: number) {
    const existing = await this.categoryManagement.getCategoryById(id);
    if (!existing) throw new NotFoundException(`Category ${id} not found`);
    return this.categoryManagement.deleteCategory(id);
  }

  addProductImage(dto: CreateProductImageDto) {
    return this.imageManagement.addProductImage(dto);
  }

  deleteProductImage(imageId: number) {
    return this.imageManagement.deleteProductImage(imageId);
  }

  addVariantImage(dto: CreateVariantImageDto) {
    return this.imageManagement.addVariantImage(dto);
  }

  deleteVariantImage(imageId: number) {
    return this.imageManagement.deleteVariantImage(imageId);
  }

  createProductOption(dto: CreateProductOptionDto) {
    return this.optionManagement.createProductOption(dto);
  }

  deleteProductOption(optionId: number) {
    return this.optionManagement.deleteProductOption(optionId);
  }

  createOptionValue(dto: CreateOptionValueDto) {
    return this.optionManagement.createOptionValue(dto);
  }

  deleteOptionValue(valueId: number) {
    return this.optionManagement.deleteOptionValue(valueId);
  }

  // ---------- Orchestrated flows ----------

  /**
   * Create a product with options, variants, and images atomically.
   * Uses Unit of Work pattern to ensure all operations succeed or rollback.
   */
  async createCompleteProduct(data: CreateCompleteProductDto) {
    const productId = await this.unitOfWork.transaction(async (tx) => {
      // Create product
      // TODO: Get organizationId from context after multi-vendor refactor
      const product = await tx.product.create({
        data: {
          name: data.product.name,
          description: data.product.description,
          seoTitle: data.product.seoTitle,
          seoDescription: data.product.seoDescription,
          seoSlug: data.product.seoSlug,
          isActive: data.product.isActive ?? false,
          organizationId: 0, // PLACEHOLDER - Replace with actual organizationId from context
        },
      });

      // Type the operations array explicitly
      const operations: Promise<any>[] = [];

      if (data.options?.length) {
        operations.push(
          tx.productOption.createMany({
            data: data.options.map(option => ({
              productId: product.id,
              name: option.name,
              position: option.position ?? 1,
            }))
          })
        );
      }

      if (data.variants?.length) {
        operations.push(
          tx.variant.createMany({
            data: data.variants.map(variant => ({
              productId: product.id,
              sku: variant.sku,
              price: variant.price,
              compareAtPrice: variant.compareAtPrice,
              currency: variant.currency,
              barcode: variant.barcode,
              weight: variant.weight,
              isActive: variant.isActive ?? true,
            }))
          })
        );
      }

      if (data.images?.length) {
        operations.push(
          tx.productImage.createMany({
            data: data.images.map((image, index) => ({
              productId: product.id,
              imageUrl: image.imageUrl,
              altText: image.altText,
              position: image.position ?? index,
              isMain: image.isMain ?? index === 0,
            }))
          })
        );
      }

      // Execute all operations in parallel
      if (operations.length > 0) {
        await Promise.all(operations);
      }

      return product.id;
    }, { timeout: 5000, maxWait: 2000 });

    return this.getProductById(productId);
  }




  /**
   * Duplicate a product with its options (and values), variants, and images.
   * Assumes variants do not need remapping to new optionValueIds; add mapping if needed.
   */
  async duplicateProduct(productId: number, newName: string) {
    const originalProduct =
      await this.productManagement.getProductById(productId);
    if (!originalProduct)
      throw new NotFoundException(`Product ${productId} not found`);

    const [options, variants, images] = await Promise.all([
      this.optionManagement.getProductOptions(productId),
      this.variantManagement.getVariantsByProductId(productId),
      this.imageManagement.getProductImages(productId),
    ]);

    // Create the new base product
    const newProduct = await this.productManagement.createProduct({
      name: newName,
      description: originalProduct.description ?? undefined,
      seoTitle: originalProduct.seoTitle ?? undefined,
      seoDescription: originalProduct.seoDescription ?? undefined,
      isActive: false,
    });

    // Duplicate options and values; track old->new option id mapping
    const optionIdMap = new Map<number, number>();
    for (const option of options) {
      const createdOption = await this.optionManagement.createProductOption({
        productId: newProduct.id,
        name: option.name,
        position: option.position,
      });
      optionIdMap.set(option.id, createdOption.id);

      const optionWithValues = option as unknown as {
        optionValues?: { id: number; value: string; position?: number }[];
      };
      if (optionWithValues.optionValues?.length) {
        for (const value of optionWithValues.optionValues) {
          await this.optionManagement.createOptionValue({
            optionId: createdOption.id,
            value: value.value,
            position: value.position,
          });
        }
      }
    }

    // Duplicate images in parallel (per-product)
    if (images?.length) {
      await Promise.all(
        images.map((img) =>
          this.imageManagement.addProductImage({
            productId: newProduct.id,
            imageUrl: img.imageUrl,
            altText: img.altText ?? undefined,
            position: img.position,
            isMain: img.isMain,
          }),
        ),
      );
    }

    // Duplicate variants (add mapping of option value IDs here if variants carry them)
    for (const variant of variants) {
      // If variant has optionValueIds tied to old options/values, remap here using a valueId map
      await this.variantManagement.createVariant({
        ...variant,
        id: undefined as unknown as never, // ensure new record if provider ignores id
        productId: newProduct.id,
      } as unknown as CreateVariantDto);
    }

    return this.productManagement.getProductById(newProduct.id);
  }

  /**
   * Wishlist APIs
   * */

  getMyWishList(id:number){
    return this.wishlistManagement.getMyWishlistCount(id)
  }

  getMyWishlistCount(id: number){
    return this.wishlistManagement.getMyWishlistCount(id)
  }

  addItemToMyWishlist(userId: number, dto: AddToWishlistDto) {
    return this.wishlistManagement.addItemToMyWishlist(userId, dto);
  }

  removeItemFromMyWishlist(userId: number, itemId: number) {
    return this.wishlistManagement.removeItemFromMyWishlist(userId, itemId);
  }

  clearMyWishlist(userId: number) {
    return this.wishlistManagement.clearMyWishlist(userId);
  }

  // ---------- Commission Management ----------

  async getProductCommissionBreakdown(productId: number) {
    // Get product with category and organization info
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            feeType: true,
            feeAmount: true,
            type: true,
          },
        },
        productCategories: {
          take: 1,
          include: {
            category: {
              select: {
                id: true,
                name: true,
                feeType: true,
                feeAmount: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product ${productId} not found`);
    }

    const primaryCategory = product.productCategories?.[0]?.category;

    // Get organization type defaults
    const orgType = await this.prisma.organizationType.findFirst({
      where: { code: product.organization.type },
      select: {
        code: true,
        displayName: true,
        defaultFeeType: true,
        defaultFeeAmount: true,
      },
    });

    // Calculate effective commission for a sample amount (e.g., $100)
    const sampleAmount = 100;
    const effectiveCommission = await this.commissionCalculator.calculateCommission(
      sampleAmount,
      product.organizationId,
      product.id,
      primaryCategory?.id,
    );

    return {
      product: {
        id: product.id,
        name: product.name,
        feeType: product.feeType,
        feeAmount: product.feeAmount,
      },
      category: primaryCategory ? {
        id: primaryCategory.id,
        name: primaryCategory.name,
        feeType: primaryCategory.feeType,
        feeAmount: primaryCategory.feeAmount,
      } : null,
      vendor: {
        id: product.organization.id,
        name: product.organization.name,
        feeType: product.organization.feeType,
        feeAmount: product.organization.feeAmount,
      },
      organizationType: orgType ? {
        code: orgType.code,
        displayName: orgType.displayName,
        defaultFeeType: orgType.defaultFeeType,
        defaultFeeAmount: orgType.defaultFeeAmount,
      } : null,
      effectiveCommission: {
        source: effectiveCommission.commissionSource,
        feeType: effectiveCommission.feeType,
        feeRate: effectiveCommission.feeRate,
        sampleCalculation: {
          amount: sampleAmount,
          platformFee: effectiveCommission.platformFeeAmount,
          vendorReceives: effectiveCommission.organizationAmount,
        },
      },
    };
  }

  async getCategoryCommissionBreakdown(categoryId: number) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: {
        id: true,
        name: true,
        feeType: true,
        feeAmount: true,
      },
    });

    if (!category) {
      throw new NotFoundException(`Category ${categoryId} not found`);
    }

    return {
      category: {
        id: category.id,
        name: category.name,
        feeType: category.feeType,
        feeAmount: category.feeAmount,
      },
      note: 'Category-level commission applies to all products in this category that do not have product-specific commission set.',
    };
  }
}

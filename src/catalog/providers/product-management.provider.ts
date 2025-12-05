import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { Product } from '@prisma/client';
import { ProductRepository } from '../repositories';
import { CreateProductDto, UpdateProductDto, ProductFilterDto } from '../dtos';
import { PaginatedResult, QueryOptions } from '../../shared/types';
import { PrismaService } from '../../core/config/prisma/prisma.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import {
  CacheResult,
  InvalidateCache,
} from '../../shared/decorators/cache-result.decorator';

@Injectable()
export class ProductManagementProvider {
  private cacheManager: Cache;

  constructor(
    private readonly productRepository: ProductRepository,
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) cacheManager: Cache,
  ) {
    this.cacheManager = cacheManager;
  }

  /**
   * Create a new product (for vendor - organization-scoped)
   */
  async createProductForOrganization(
    createProductDto: CreateProductDto,
    organizationId: number,
  ): Promise<Product> {
    // Check if slug already exists
    if (createProductDto.seoSlug) {
      const existingProduct = await this.productRepository.findBySlug(
        createProductDto.seoSlug,
      );
      if (existingProduct) {
        throw new ConflictException(
          `Product with slug '${createProductDto.seoSlug}' already exists`,
        );
      }
    }

    // Attach organizationId to the product
    const productData = {
      ...createProductDto,
      organizationId,
    };

    return this.productRepository.create(productData);
  }

  /**
   * Create a new product (legacy - for backward compatibility)
   */
  async createProduct(createProductDto: CreateProductDto): Promise<Product> {
    // Check if slug already exists
    if (createProductDto.seoSlug) {
      const existingProduct = await this.productRepository.findBySlug(
        createProductDto.seoSlug,
      );
      if (existingProduct) {
        throw new ConflictException(
          `Product with slug '${createProductDto.seoSlug}' already exists`,
        );
      }
    }

    return this.productRepository.create(createProductDto);
  }

  /**
   * Update an existing product (for vendor - organization-scoped)
   * Invalidates cache after update
   */
  async updateProductForOrganization(
    id: number,
    updateProductDto: UpdateProductDto,
    organizationId: number,
  ): Promise<Product> {
    const product = await this.productRepository.findByIdForOrganization(
      id,
      organizationId,
    );
    if (!product) {
      throw new NotFoundException(
        `Product with ID ${id} not found for your organization`,
      );
    }

    // Check slug uniqueness if being updated
    if (updateProductDto.seoSlug && updateProductDto.seoSlug !== product.seoSlug) {
      const existingProduct = await this.productRepository.findBySlug(
        updateProductDto.seoSlug,
      );
      if (existingProduct && existingProduct.id !== id) {
        throw new ConflictException(
          `Product with slug '${updateProductDto.seoSlug}' already exists`,
        );
      }
    }

    const updatedProduct = await this.productRepository.update(id, updateProductDto);

    // Invalidate caches
    await this.invalidateProductCache(id, organizationId, product.seoSlug || undefined);

    return updatedProduct;
  }

  /**
   * Update an existing product (legacy - for backward compatibility)
   */
  async updateProduct(
    id: number,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Check slug uniqueness if being updated
    if (updateProductDto.seoSlug && updateProductDto.seoSlug !== product.seoSlug) {
      const existingProduct = await this.productRepository.findBySlug(
        updateProductDto.seoSlug,
      );
      if (existingProduct && existingProduct.id !== id) {
        throw new ConflictException(
          `Product with slug '${updateProductDto.seoSlug}' already exists`,
        );
      }
    }

    return this.productRepository.update(id, updateProductDto);
  }

  /**
   * Soft delete a product (for vendor - organization-scoped)
   * Invalidates cache after deletion
   */
  async deleteProductForOrganization(
    id: number,
    organizationId: number,
  ): Promise<void> {
    const product = await this.productRepository.findByIdForOrganization(
      id,
      organizationId,
    );
    if (!product) {
      throw new NotFoundException(
        `Product with ID ${id} not found for your organization`,
      );
    }

    await this.productRepository.delete(id);

    // Invalidate caches
    await this.invalidateProductCache(id, organizationId, product.seoSlug || undefined);
  }

  /**
   * Soft delete a product (legacy - for backward compatibility)
   */
  async deleteProduct(id: number): Promise<void> {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    await this.productRepository.delete(id);
  }

  /**
   * Get a single product by ID (for vendor - organization-scoped)
   * Cached for 2 minutes with org-specific key using RedisJSON
   */
  @CacheResult({
    ttl: 120000, // 2 minutes
    keyPrefix: 'product-vendor',
    includeOrgId: true, // First param is orgId? No, second param is!
    keyGenerator: (id: number, organizationId: number) =>
      `product-vendor:org:${organizationId}:product:${id}`,
    dataStructure: 'json', // Use RedisJSON for best performance
  })
  async getProductByIdForOrganization(
    id: number,
    organizationId: number,
  ): Promise<Product> {
    const product = await this.productRepository.findByIdForOrganization(
      id,
      organizationId,
    );
    if (!product || product.deletedAt) {
      throw new NotFoundException(
        `Product with ID ${id} not found for your organization`,
      );
    }

    return product;
  }

  /**
   * Get a single product by ID (public - for catalog viewing)
   * Cached for 5 minutes using RedisJSON
   */
  @CacheResult({
    ttl: 300000, // 5 minutes
    keyPrefix: 'product-public',
    keyGenerator: (id: number) => `product-public:${id}`,
    dataStructure: 'json', // Use RedisJSON for best performance
  })
  async getProductById(id: number): Promise<Product> {
    console.log('[ProductManagementProvider] getProductById called, cacheManager:', !!this.cacheManager);
    const product = await this.productRepository.findById(id);
    if (!product || product.deletedAt) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  /**
   * Get a single product by slug
   * Cached for 5 minutes using RedisJSON
   */
  @CacheResult({
    ttl: 300000, // 5 minutes
    keyPrefix: 'product-public-slug',
    keyGenerator: (slug: string) => `product-public-slug:${slug}`,
    dataStructure: 'json', // Use RedisJSON for best performance
  })
  async getProductBySlug(slug: string): Promise<Product> {
    const product = await this.productRepository.findBySlug(slug);
    if (!product || product.deletedAt) {
      throw new NotFoundException(`Product with slug '${slug}' not found`);
    }

    return product;
  }

  /**
   * Get all products with filtering, sorting, and pagination (for vendor - organization-scoped)
   * Using string cache for arrays (works well for lists)
   */

  @CacheResult({
    ttl: 120000, // 2 minutes
    keyPrefix: 'products-list',
    keyGenerator: (filterDto: ProductFilterDto) =>
      `products-list:${JSON.stringify(filterDto)}`,
    dataStructure: 'string', // Arrays work fine with string serialization
  })
  async getAllProductsForOrganization(
    filterDto: ProductFilterDto,
    organizationId: number,
  ): Promise<PaginatedResult<Product>> {
    // Validate price range
    if (filterDto.minPrice && filterDto.maxPrice && filterDto.minPrice > filterDto.maxPrice) {
      throw new ConflictException('minPrice cannot be greater than maxPrice');
    }

    const categoryFilter = filterDto.categoryId
      ? { productCategories: { some: { categoryId: filterDto.categoryId } } }
      : {};

    const options: QueryOptions = {
      filters: {
        isActive: filterDto.isActive,
        minPrice: filterDto.minPrice,
        maxPrice: filterDto.maxPrice,
        minRating: filterDto.maxRating,
        ...categoryFilter,
      },
      pagination: {
        page: filterDto.page || 1,
        limit: filterDto.limit || 10,
      },
      sort: filterDto.sortBy ? {
        field: filterDto.sortBy,
        order: filterDto.sortOrder || 'asc',
      } : undefined,
      search: filterDto.search ? {
        query: filterDto.search,
        fields: ['name', 'description'],
      } : undefined,
    };

    return this.productRepository.findWithFiltersForOrganization(
      options,
      organizationId,
    );
  }

  /**
   * Get all products with filtering, sorting, and pagination (public - for catalog viewing)
   * Cached for 3 minutes using string (arrays work well with string)
   */
  @CacheResult({
    ttl: 600000, // 10 minutes
    keyPrefix: 'products-public-list',
    keyGenerator: (filterDto: ProductFilterDto) =>
      `products-public-list:${JSON.stringify(filterDto)}`,
    dataStructure: 'json', // Arrays work fine with string serialization
  })
  async getAllProducts(filterDto: ProductFilterDto) {
    // Validate price range
    if (filterDto.minPrice && filterDto.maxPrice && filterDto.minPrice > filterDto.maxPrice) {
      throw new ConflictException('minPrice cannot be greater than maxPrice');
    }

    const categoryFilter = filterDto.categoryId
      ? { productCategories: { some: { categoryId: filterDto.categoryId } } }
      : {};

    const options: QueryOptions = {
      filters: {
        isActive: filterDto.isActive,
        minPrice: filterDto.minPrice,
        maxPrice: filterDto.maxPrice,
        minRating: filterDto.maxRating,
        ...categoryFilter,
      },
      pagination: {
        page: filterDto.page || 1,
        limit: filterDto.limit || 10,
      },
      sort: filterDto.sortBy ? {
        field: filterDto.sortBy,
        order: filterDto.sortOrder || 'asc',
      } : undefined,
      search: filterDto.search ? {
        query: filterDto.search,
        fields: ['name', 'description'],
      } : undefined,
    };

    return this.productRepository.findWithFilters(options);
  }




  /**
   * Get all active products
   */
  async getActiveProducts(): Promise<Product[]> {
    return this.productRepository.findActiveProducts();
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(categoryId: number): Promise<Product[]> {
    return this.productRepository.findWithCategories(categoryId);
  }

  /**
   * Publish a product (for vendor - organization-scoped)
   */
  async publishProductForOrganization(
    id: number,
    organizationId: number,
  ): Promise<Product> {
    const product = await this.productRepository.findByIdForOrganization(
      id,
      organizationId,
    );
    if (!product) {
      throw new NotFoundException(
        `Product with ID ${id} not found for your organization`,
      );
    }

    return this.productRepository.update(id, { isActive: true });
  }

  /**
   * Unpublish a product (for vendor - organization-scoped)
   */
  async unpublishProductForOrganization(
    id: number,
    organizationId: number,
  ): Promise<Product> {
    const product = await this.productRepository.findByIdForOrganization(
      id,
      organizationId,
    );
    if (!product) {
      throw new NotFoundException(
        `Product with ID ${id} not found for your organization`,
      );
    }

    return this.productRepository.update(id, { isActive: false });
  }

  /**
   * Publish a product (legacy - for backward compatibility)
   */
  async publishProduct(id: number): Promise<Product> {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return this.productRepository.update(id, { isActive: true });
  }

  /**
   * Unpublish a product (legacy - for backward compatibility)
   */
  async unpublishProduct(id: number): Promise<Product> {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return this.productRepository.update(id, { isActive: false });
  }

  /**
   * Add product to category
   */
  async addProductToCategory(
    productId: number,
    categoryId: number,
  ): Promise<void> {
    const product = await this.productRepository.findById(productId);
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // Check if category exists
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      throw new NotFoundException(`Category with ID ${categoryId} not found`);
    }

    // Check if already associated
    const existingAssociation = await this.prisma.productCategory.findUnique({
      where: {
        productId_categoryId: {
          productId,
          categoryId,
        },
      },
    });

    if (existingAssociation) {
      throw new ConflictException(
        `Product is already associated with this category`,
      );
    }

    await this.prisma.productCategory.create({
      data: {
        productId,
        categoryId,
      },
    });
  }

  /**
   * Remove product from category
   */
  async removeProductFromCategory(
    productId: number,
    categoryId: number,
  ): Promise<void> {
    const association = await this.prisma.productCategory.findUnique({
      where: {
        productId_categoryId: {
          productId,
          categoryId,
        },
      },
    });

    if (!association) {
      throw new NotFoundException(
        `Product is not associated with this category`,
      );
    }

    await this.prisma.productCategory.delete({
      where: {
        productId_categoryId: {
          productId,
          categoryId,
        },
      },
    });
  }

  /**
   * Search products
   */
  // async searchProducts(query: string): Promise<Product[]> {
  //   return this.productRepository.search(query, [
  //     'name',
  //     'description',
  //     'seoKeywords',
  //   ]);
  // }

    /**
     * Search products another endpoint
     */
    async searchProducts(query: string, filters: ProductFilterDto) {
        return this.productRepository.searchProducts(query, filters);
    }

  /**
   * Helper method to invalidate product caches
   * Called when product is updated or deleted
   */
  private async invalidateProductCache(
    productId: number,
    organizationId: number,
    productSlug?: string,
  ): Promise<void> {
    try {
      // Invalidate public product cache
      await this.cacheManager.del(`product-public:${productId}`);

      // Invalidate vendor product cache
      await this.cacheManager.del(
        `product-vendor:org:${organizationId}:product:${productId}`,
      );

      // Invalidate slug cache if provided
      if (productSlug) {
        await this.cacheManager.del(`product-public-slug:${productSlug}`);
      }
    } catch (error) {
      // Log error but don't throw - cache invalidation failure shouldn't break updates
      console.error('Failed to invalidate product cache:', error);
    }
  }

}

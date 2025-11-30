import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Bundle } from '@prisma/client';
import { BundleRepository, BundleItemRepository } from '../repositories';
import { CreateBundleDto, UpdateBundleDto, BundleFilterDto } from '../dtos';
import { PaginatedResult, QueryOptions } from '../../shared/types';
import { UnitOfWorkService } from '../../shared/services/unit-of-work.service';
import { PrismaService } from '../../core/config/prisma/prisma.service';

@Injectable()
export class BundleManagementProvider {
  constructor(
    private readonly bundleRepository: BundleRepository,
    private readonly bundleItemRepository: BundleItemRepository,
    private readonly unitOfWork: UnitOfWorkService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Create a new bundle with items (transactional)
   */
  async createBundle(createBundleDto: CreateBundleDto): Promise<any> {
    // Validate that at least one item is provided
    if (!createBundleDto.items || createBundleDto.items.length === 0) {
      throw new BadRequestException('Bundle must have at least one item');
    }

    // Check for duplicate variants in items
    const variantIds = createBundleDto.items.map((item) => item.variantId);
    const uniqueVariantIds = new Set(variantIds);
    if (variantIds.length !== uniqueVariantIds.size) {
      throw new BadRequestException(
        'Duplicate variants are not allowed in a bundle',
      );
    }

    // Create bundle with items in a transaction
    return this.unitOfWork.transaction(async (tx) => {
      // Verify all variants exist
      const variants = await tx.variant.findMany({
        where: {
          id: {
            in: variantIds,
          },
        },
      });

      if (variants.length !== variantIds.length) {
        const foundIds = variants.map((v) => v.id);
        const missingIds = variantIds.filter((id) => !foundIds.includes(id));
        throw new NotFoundException(
          `Variants with IDs ${missingIds.join(', ')} not found`,
        );
      }

      // Create the bundle
      const bundle = await tx.bundle.create({
        data: {
          name: createBundleDto.name,
          description: createBundleDto.description,
          price: createBundleDto.price,
          isActive: createBundleDto.isActive ?? true,
        },
      });

      // Create bundle items
      await tx.bundleItem.createMany({
        data: createBundleDto.items.map((item) => ({
          bundleId: bundle.id,
          variantId: item.variantId,
          quantity: item.quantity,
        })),
      });

      // Return complete bundle with items
      return tx.bundle.findUnique({
        where: { id: bundle.id },
        include: {
          bundleItems: {
            include: {
              variant: {
                include: {
                  product: true,
                },
              },
            },
          },
        },
      });
    });
  }

  /**
   * Update an existing bundle
   */
  async updateBundle(
    id: number,
    updateBundleDto: UpdateBundleDto,
  ): Promise<Bundle> {
    const bundle = await this.bundleRepository.findById(id);
    if (!bundle) {
      throw new NotFoundException(`Bundle with ID ${id} not found`);
    }

    return this.bundleRepository.update(id, updateBundleDto);
  }

  /**
   * Delete a bundle
   */
  async deleteBundle(id: number): Promise<void> {
    const bundle = await this.bundleRepository.findById(id);
    if (!bundle) {
      throw new NotFoundException(`Bundle with ID ${id} not found`);
    }

    // Delete bundle (cascade will handle bundle items)
    await this.bundleRepository.delete(id);
  }

  /**
   * Get a single bundle by ID
   */
  async getBundleById(id: number): Promise<Bundle> {
    const bundle = await this.bundleRepository.findById(id);
    if (!bundle) {
      throw new NotFoundException(`Bundle with ID ${id} not found`);
    }

    return bundle;
  }

  /**
   * Get all bundles with filters
   */
  async getAllBundles(filterDto: BundleFilterDto): Promise<PaginatedResult<Bundle>> {
    const filters: any = {};

    // Add isActive filter
    if (filterDto.isActive !== undefined) {
      filters.isActive = filterDto.isActive;
    }

    // Add price range filters
    if (filterDto.minPrice !== undefined || filterDto.maxPrice !== undefined) {
      filters.price = {};
      if (filterDto.minPrice !== undefined) {
        filters.price.gte = filterDto.minPrice;
      }
      if (filterDto.maxPrice !== undefined) {
        filters.price.lte = filterDto.maxPrice;
      }
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
            order: (filterDto.sortOrder as 'asc' | 'desc') || 'desc',
          }
        : undefined,
    };

    // Add search
    if (filterDto.search) {
      queryOptions.search = {
        query: filterDto.search,
        fields: ['name', 'description'],
      };
    }

    return this.bundleRepository.findWithFilters(queryOptions);
  }

  /**
   * Get active bundles only
   */
  async getActiveBundles(): Promise<Bundle[]> {
    return this.bundleRepository.findActiveBundles();
  }

  /**
   * Add item to bundle (transactional)
   */
  async addItemToBundle(
    bundleId: number,
    variantId: number,
    quantity: number,
  ): Promise<any> {
    const bundle = await this.bundleRepository.findById(bundleId);
    if (!bundle) {
      throw new NotFoundException(`Bundle with ID ${bundleId} not found`);
    }

    // Check if item already exists in bundle
    const existingItem = await this.bundleItemRepository.findByBundleAndVariant(
      bundleId,
      variantId,
    );
    if (existingItem) {
      throw new ConflictException(
        `Variant ${variantId} already exists in this bundle`,
      );
    }

    return this.unitOfWork.transaction(async (tx) => {
      // Verify variant exists
      const variant = await tx.variant.findUnique({
        where: { id: variantId },
      });
      if (!variant) {
        throw new NotFoundException(`Variant with ID ${variantId} not found`);
      }

      // Create bundle item
      await tx.bundleItem.create({
        data: {
          bundleId,
          variantId,
          quantity,
        },
      });

      // Return updated bundle
      return tx.bundle.findUnique({
        where: { id: bundleId },
        include: {
          bundleItems: {
            include: {
              variant: {
                include: {
                  product: true,
                },
              },
            },
          },
        },
      });
    });
  }

  /**
   * Remove item from bundle
   */
  async removeItemFromBundle(bundleId: number, itemId: number): Promise<any> {
    const bundle = await this.bundleRepository.findById(bundleId);
    if (!bundle) {
      throw new NotFoundException(`Bundle with ID ${bundleId} not found`);
    }

    const item = await this.bundleItemRepository.findById(itemId);
    if (!item || item.bundleId !== bundleId) {
      throw new NotFoundException(
        `Bundle item with ID ${itemId} not found in bundle ${bundleId}`,
      );
    }

    // Check if this is the last item
    const itemCount = await this.bundleItemRepository.countTotal({
      bundleId,
    });
    if (itemCount <= 1) {
      throw new BadRequestException(
        'Cannot remove the last item from a bundle',
      );
    }

    await this.bundleItemRepository.delete(itemId);

    return this.bundleRepository.findById(bundleId);
  }
}

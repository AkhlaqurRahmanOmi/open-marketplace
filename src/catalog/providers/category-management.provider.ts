import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Category } from '@prisma/client';
import { CategoryRepository } from '../repositories/category.repository';
import { CreateCategoryDto, UpdateCategoryDto } from '../dtos';
import { PrismaService } from '../../core/config/prisma/prisma.service';

@Injectable()
export class CategoryManagementProvider {
  constructor(
    private readonly categoryRepository: CategoryRepository,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Create a new category
   */
  async createCategory(
    createCategoryDto: CreateCategoryDto,
  ): Promise<Category> {
    // Check if slug already exists
    const existingCategory = await this.categoryRepository.findBySlug(
      createCategoryDto.slug,
    );
    if (existingCategory) {
      throw new ConflictException(
        `Category with slug '${createCategoryDto.slug}' already exists`,
      );
    }

    // If parentId is provided, verify it exists
    if (createCategoryDto.parentId) {
      const parentCategory = await this.categoryRepository.findById(
        createCategoryDto.parentId,
      );
      if (!parentCategory) {
        throw new NotFoundException(
          `Parent category with ID ${createCategoryDto.parentId} not found`,
        );
      }
    }

    return this.categoryRepository.create(createCategoryDto);
  }

  /**
   * Update an existing category
   */
  async updateCategory(
    id: number,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // Check slug uniqueness if being updated
    if (updateCategoryDto.slug && updateCategoryDto.slug !== category.slug) {
      const existingCategory = await this.categoryRepository.findBySlug(
        updateCategoryDto.slug,
      );
      if (existingCategory && existingCategory.id !== id) {
        throw new ConflictException(
          `Category with slug '${updateCategoryDto.slug}' already exists`,
        );
      }
    }

    // If parentId is being updated, verify it exists and prevent circular reference
    if (
      updateCategoryDto.parentId !== undefined &&
      updateCategoryDto.parentId !== category.parentId
    ) {
      if (updateCategoryDto.parentId === id) {
        throw new BadRequestException(
          'A category cannot be its own parent',
        );
      }

      if (updateCategoryDto.parentId) {
        const parentCategory = await this.categoryRepository.findById(
          updateCategoryDto.parentId,
        );
        if (!parentCategory) {
          throw new NotFoundException(
            `Parent category with ID ${updateCategoryDto.parentId} not found`,
          );
        }

        // Check for circular reference (prevent setting parent to a descendant)
        const isDescendant = await this.isDescendant(
          id,
          updateCategoryDto.parentId,
        );
        if (isDescendant) {
          throw new BadRequestException(
            'Cannot set parent to a descendant category (circular reference)',
          );
        }
      }
    }

    return this.categoryRepository.update(id, updateCategoryDto);
  }

  /**
   * Delete a category
   */
  async deleteCategory(id: number): Promise<void> {
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // Check if category has children
    const children = await this.categoryRepository.findChildren(id);
    if (children.length > 0) {
      throw new BadRequestException(
        'Cannot delete category with child categories. Please delete or reassign child categories first.',
      );
    }

    // Check if category has products
    const productCount =
      await this.categoryRepository.countProductsInCategory(id);
    if (productCount > 0) {
      throw new BadRequestException(
        `Cannot delete category with ${productCount} associated products. Please reassign products first.`,
      );
    }

    await this.categoryRepository.delete(id);
  }

  /**
   * Get a single category by ID
   */
  async getCategoryById(id: number): Promise<Category> {
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  /**
   * Get a single category by slug
   */
  async getCategoryBySlug(slug: string): Promise<Category> {
    const category = await this.categoryRepository.findBySlug(slug);
    if (!category) {
      throw new NotFoundException(`Category with slug '${slug}' not found`);
    }

    return category;
  }

  /**
   * Get all categories
   */
  async getAllCategories(): Promise<Category[]> {
    return this.categoryRepository.findAll()
  }

  /**
   * Get root categories (no parent)
   */
  async getRootCategories(): Promise<Category[]> {
    return this.categoryRepository.findRootCategories();
  }

  /**
   * Get child categories of a parent
   */
  async getChildCategories(parentId: number): Promise<Category[]> {
    // Verify parent exists
    const parent = await this.categoryRepository.findById(parentId);
    if (!parent) {
      throw new NotFoundException(`Category with ID ${parentId} not found`);
    }

    return this.categoryRepository.findChildren(parentId);
  }

  /**
   * Get category tree (hierarchical structure)
   */
  async getCategoryTree(): Promise<Category[]> {
    return this.categoryRepository.findCategoryTree()
  }

  /**
   * Get category path (breadcrumb)
   */
  async getCategoryPath(categoryId: number): Promise<Category[]> {
    const category = await this.categoryRepository.findById(categoryId);
    if (!category) {
      throw new NotFoundException(`Category with ID ${categoryId} not found`);
    }

    return this.categoryRepository.findCategoryPath(categoryId);
  }

  /**
   * Get products in a category
   */
  async getProductsByCategory(categoryId: number) {
    const category = await this.categoryRepository.findById(categoryId);
    if (!category) {
      throw new NotFoundException(`Category with ID ${categoryId} not found`);
    }

    return (category as any).productCategories?.map((pc: any) => pc.product) || [];
  }

  /**
   * Count products in a category
   */
  async countProductsInCategory(categoryId: number): Promise<number> {
    const category = await this.categoryRepository.findById(categoryId);
    if (!category) {
      throw new NotFoundException(`Category with ID ${categoryId} not found`);
    }

    return this.categoryRepository.countProductsInCategory(categoryId);
  }

  /**
   * Helper method to check if a category is a descendant of another
   */
  private async isDescendant(
    ancestorId: number,
    categoryId: number,
  ): Promise<boolean> {
    const path = await this.categoryRepository.findCategoryPath(categoryId);
    return path.some((cat) => cat.id === ancestorId);
  }

  /**
   * helper method to count
   */
  private transformWithProductCount(category: any): any {
    return {
      ...category,
      productCount: category._count?.productCategories || 0,
      _count: undefined,
      children: category.children?.map((c: any) => this.transformWithProductCount(c)),
    };
  }

}

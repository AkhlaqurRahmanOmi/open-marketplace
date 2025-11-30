import { Injectable } from '@nestjs/common';
import { Product } from '@prisma/client';
import Fuse  from 'fuse.js'
import { PrismaService } from '../../core/config/prisma/prisma.service';
import { BaseRepository } from '../../shared/repository/base.repository';
import {
  FilterOptions,
  PaginatedResult,
  QueryOptions,
} from '../../shared/types';
import {ProductFilterDto} from "../dtos";

@Injectable()
export class ProductRepository extends BaseRepository<Product, number> {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findById(id: number): Promise<Product | null> {
    return this.prisma.product.findUnique({
      where: { id },
      include: {
        productImages: true,
        variants: {
          include: {
            variantInventories: true,
          },
        },
        productCategories: {
          include: {
            category: {
              include: {
                parent: true,
              },
            },
          },
        },
        productOptions: {
          include: {
            optionValues: true,
          },
        },
        productAttributes: true,
        reviews:{

        }
      },
    });
  }

  async findAll(): Promise<Product[]> {
    return this.prisma.product.findMany({
      where: { deletedAt: null },
      include: {
        productImages: {
          where: { isMain: true },
          take: 1,
        },
        variants: {
          take: 1,
          orderBy: { price: 'asc' },
        },
        reviews: true
      },
    });
  }

  async create(data: Partial<Product>): Promise<Product> {
    return this.prisma.product.create({
      data: data as any,
      include: {
        productImages: true,
        variants: true,
      },
    });
  }

  async update(id: number, data: Partial<Product>): Promise<Product> {
    return this.prisma.product.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
      include: {
        productImages: true,
        variants: true,
        productCategories: {
          include: {
            category: true,
          },
        },
      },
    });
  }

  async delete(id: number): Promise<void> {
    // Soft delete
    await this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findWithFilters(options: QueryOptions): Promise<PaginatedResult<Product>> {
    const {
      filters = {},
      sort,
      pagination = { page: 1, limit: 10 },
      search,
    } = options;

    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    // Build base where clause
    const where: any = {
      deletedAt: null,
      isActive: true,
      ...filters,
    };

    // Add search functionality
    if (search?.query) {
      where.OR = search.fields.map((field) => ({
        [field]: {
          contains: search.query,
          mode: 'insensitive',
        },
      }));
    }

    // Handle price filtering from filters object
    if (filters.minPrice || filters.maxPrice) {
      const priceConditions: any = {};
      if (filters.minPrice) priceConditions.gte = filters.minPrice;
      if (filters.maxPrice) priceConditions.lte = filters.maxPrice;

      where.variants = {
        some: {
          isActive: true,
          price: priceConditions,
        },
      };

      delete where.minPrice;
      delete where.maxPrice;
    }

    // Handle rating filtering - remove from where clause
    if (filters.minRating) {
      delete where.minRating;
    }

    // Create separate where clause for count (without rating filter)
    const whereForCount = { ...where };

    const productsQuery = this.prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: sort ? { [sort.field]: sort.order } : { createdAt: 'desc' },
      include: {
        productImages: {
          where: { isMain: true },
          take: 1,
        },
        variants: {
          where: { isActive: true },
          orderBy: { price: 'asc' },
        },
        productCategories: {
          include: {
            category: {
              include: {
                parent: true,
              },
            },
          },
        },
        reviews: {
          select:{
            rating: true
          }
        },
      },
    });

    const countQuery = this.prisma.product.count({ where: whereForCount });
    const [products, total] = await Promise.all([productsQuery, countQuery]);

    // Filter by rating if specified
    let filteredProducts = products;
    if (filters.minRating) {
      filteredProducts = products.filter((product) => {
        if (product.reviews.length === 0) return true;
        const avgRating = product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length;
        return avgRating < filters.minRating;
      });
    }

    return {
      data: filteredProducts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }




  async search(query: string, fields: string[]): Promise<Product[]> {
    const where: any = {
      deletedAt: null,
      OR: fields.map((field) => ({
        [field]: {
          contains: query,
          mode: 'insensitive',
        },
      })),
    };

    return this.prisma.product.findMany({
      where,
      include: {
        productImages: {
          where: { isMain: true },
          take: 1,
        },
        variants: {
          take: 1,
          orderBy: { price: 'asc' },
        },
        reviews: true
      },
    });
  }

  async countTotal(filters?: FilterOptions): Promise<number> {
    return this.prisma.product.count({
      where: {
        deletedAt: null,
        ...filters,
      },
    });
  }

  // Catalog-specific methods
  async findWithCategories(categoryId: number): Promise<Product[]> {
    return this.prisma.product.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        productCategories: {
          some: {
            categoryId,
          },
        },
      },
      include: {
        productImages: {
          where: { isMain: true },
          take: 1,
        },
        variants: {
          take: 1,
          orderBy: { price: 'asc' },
        },
        reviews: true
      },
    });
  }

  async findBySlug(slug: string): Promise<Product | null> {
    return this.prisma.product.findUnique({
      where: { seoSlug: slug },
      include: {
        productImages: true,
        variants: true,
        productCategories: {
          include: {
            category: true,
          },
        },
        productOptions: {
          include: {
            optionValues: true,
          },
        },
        productAttributes: true,
        reviews: true
      },
    });
  }

  async findActiveProducts(): Promise<Product[]> {
    return this.prisma.product.findMany({
      where: {
        deletedAt: null,
        isActive: true,
      },
      include: {
        productImages: {
          where: { isMain: true },
          take: 1,
        },
        variants: {
          where: { isActive: true },
          take: 1,
          orderBy: { price: 'asc' },
        },
        reviews: true
      },
    });
  }

    async searchProducts(query: string, filters: ProductFilterDto) {
        // Get all active products
        const products = await this.prisma.product.findMany({
            where: {
                isActive: true,
                deletedAt: null
            },
            include: {
                variants: true,
                productCategories: { include: { category: true } },
                reviews: true
            }
        });

        // Configure Fuse for fuzzy search
        const fuse = new Fuse(products, {
            keys: ['name', 'description'],
            threshold: 0.4, // 0 = exact match, 1 = match anything
            includeScore: true
        });

        // Return fuzzy search results
        return fuse.search(query).map(result => result.item);
    }

}

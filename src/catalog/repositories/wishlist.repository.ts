import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/config/prisma/prisma.service';
import { BaseRepository } from '../../shared/repository/base.repository';
import { Wishlist, WishlistItem } from '@prisma/client';
import { FilterOptions, PaginatedResult, QueryOptions } from '../../shared/types';

@Injectable()
export class WishlistRepository extends BaseRepository<Wishlist, number> {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getOrCreateByUserId(userId: number): Promise<Wishlist> {
    const existing = await this.prisma.wishlist.findFirst({ where: { userId } });
    if (existing) return existing;
    return this.prisma.wishlist.create({ data: { userId } });
  }

  async findByUserIdWithItems(userId: number) {
    const wishlist = await this.prisma.wishlist.findFirst({
      where: { userId },
      include: {
        wishlistItems: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            variant: {
              select: {
                id: true,
                sku: true,
                price: true,
                product: {
                  select: {
                    id: true,
                    name: true,
                    productImages: {
                      where: { isMain: true },
                      take: 1,
                      select: { imageUrl: true },
                    },
                  },
                },
              },
            },
            bundle: {
              select: { id: true, name: true, price: true },
            },
          },
        },
      },
    });

    return wishlist;
  }

  async countItemsByUserId(userId: number): Promise<number> {
    return this.prisma.wishlistItem.count({ where: { wishlist: { userId } } });
  }

  async addItem(
    wishlistId: number,
    data: { variantId?: number; bundleId?: number },
  ): Promise<WishlistItem> {
    const provided = [data.variantId, data.bundleId].filter((v) => v != null);
    if (provided.length !== 1) {
      throw new BadRequestException('Provide exactly one of variantId or bundleId');
    }

    try {
      if (data.variantId) {
        // Use composite unique upsert to make operation idempotent
        return await this.prisma.wishlistItem.upsert({
          where: {
            wishlistId_variantId: {
              wishlistId,
              variantId: data.variantId,
            },
          },
          create: {
            wishlistId,
            variantId: data.variantId,
          },
          update: { updatedAt: new Date() },
        });
      }

      // bundleId path
      return await this.prisma.wishlistItem.upsert({
        where: {
          wishlistId_bundleId: {
            wishlistId,
            bundleId: data.bundleId!,
          },
        },
        create: {
          wishlistId,
          bundleId: data.bundleId!,
        },
        update: { updatedAt: new Date() },
      });
    } catch (e: any) {
      // P2003 = Foreign key constraint failed (invalid variantId/bundleId)
      if (e?.code === 'P2003') {
        if (data.variantId) throw new NotFoundException('Variant not found');
        if (data.bundleId) throw new NotFoundException('Bundle not found');
      }
      throw e;
    }
  }

  async removeItemById(wishlistId: number, itemId: number): Promise<void> {
    const res = await this.prisma.wishlistItem.deleteMany({
      where: { id: itemId, wishlistId },
    });
    if (res.count === 0) throw new NotFoundException('Wishlist item not found');
  }

  async clear(wishlistId: number): Promise<number> {
    const res = await this.prisma.wishlistItem.deleteMany({ where: { wishlistId } });
    return res.count;
  }

  // --- BaseRepository implementations ---

  async findById(id: number): Promise<Wishlist | null> {
    return this.prisma.wishlist.findUnique({
      where: { id },
      include: {
        _count: { select: { wishlistItems: true } },
      },
    });
  }

  async findAll(): Promise<Wishlist[]> {
    return this.prisma.wishlist.findMany({
      include: {
        _count: { select: { wishlistItems: true } },
      },
    });
  }

  async create(data: Partial<Wishlist>): Promise<Wishlist> {
    return this.prisma.wishlist.create({
      data: data as any,
    });
  }

  async update(id: number, data: Partial<Wishlist>): Promise<Wishlist> {
    return this.prisma.wishlist.update({
      where: { id },
      data: { ...data, updatedAt: new Date() } as any,
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.wishlist.delete({ where: { id } });
  }

  async findWithFilters(options: QueryOptions): Promise<PaginatedResult<Wishlist>> {
    const {
      filters = {},
      sort,
      pagination = { page: 1, limit: 10 },
    } = options;

    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const where: any = { ...filters };

    const listQuery = this.prisma.wishlist.findMany({
      where,
      skip,
      take: limit,
      orderBy: sort ? { [sort.field]: sort.order } : { createdAt: 'desc' },
      include: {
        _count: { select: { wishlistItems: true } },
      },
    });

    const countQuery = this.prisma.wishlist.count({ where });

    const [data, total] = await Promise.all([listQuery, countQuery]);

    return {
      data,
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

  async search(query: string, fields: string[]): Promise<Wishlist[]> {
    const or: any[] = [];
    if (fields.includes('user.email'))
      or.push({ user: { email: { contains: query, mode: 'insensitive' } } });
    if (fields.includes('user.firstName'))
      or.push({ user: { firstName: { contains: query, mode: 'insensitive' } } });
    if (fields.includes('user.lastName'))
      or.push({ user: { lastName: { contains: query, mode: 'insensitive' } } });

    if (or.length === 0) return [];

    return this.prisma.wishlist.findMany({ where: { OR: or } });
  }

  async countTotal(filters?: FilterOptions): Promise<number> {
    return this.prisma.wishlist.count({ where: { ...(filters || {}) } as any });
  }
}

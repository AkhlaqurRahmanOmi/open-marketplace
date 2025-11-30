import { Injectable } from '@nestjs/common';
import { Location } from '@prisma/client';
import { PrismaService } from '../../core/config/prisma/prisma.service';
import { BaseRepository } from '../../shared/repository/base.repository';

@Injectable()
export class LocationRepository extends BaseRepository<Location, number> {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findById(id: number): Promise<Location | null> {
    return this.prisma.location.findUnique({
      where: { id },
      include: {
        variantInventories: {
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
  }

  async findAll(): Promise<Location[]> {
    return this.prisma.location.findMany({
      include: {
        variantInventories: {
          select: {
            variantId: true,
            quantity: true,
            reserved: true,
          },
        },
      },
    });
  }

  async create(data: Partial<Location>): Promise<Location> {
    return this.prisma.location.create({
      data: data as any,
    });
  }

  async update(id: number, data: Partial<Location>): Promise<Location> {
    return this.prisma.location.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.location.delete({
      where: { id },
    });
  }

  async findWithInventory(id: number): Promise<Location | null> {
    return this.prisma.location.findUnique({
      where: { id },
      include: {
        variantInventories: {
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
  }

  async countTotal(): Promise<number> {
    return this.prisma.location.count();
  }

  async findWithFilters(options: any): Promise<any> {
    const {
      filters = {},
      sort,
      pagination = { page: 1, limit: 10 },
    } = options;

    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.location.findMany({
        where: filters,
        skip,
        take: limit,
        orderBy: sort ? { [sort.field]: sort.order } : { createdAt: 'desc' },
      }),
      this.prisma.location.count({ where: filters }),
    ]);

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

  async search(query: string, fields: string[]): Promise<Location[]> {
    const where: any = {
      OR: fields.map((field) => ({
        [field]: {
          contains: query,
          mode: 'insensitive',
        },
      })),
    };

    return this.prisma.location.findMany({ where });
  }
}

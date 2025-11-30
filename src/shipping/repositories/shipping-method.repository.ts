import { Injectable } from '@nestjs/common';
import { ShippingMethod, Prisma } from '@prisma/client';
import { PrismaService } from '../../core/config/prisma/prisma.service';
import { BaseRepository } from '../../shared/repository/base.repository';
import { QueryOptions, PaginatedResult, FilterOptions } from '../../shared/types';

@Injectable()
export class ShippingMethodRepository extends BaseRepository<ShippingMethod, number> {
    constructor(private readonly prisma: PrismaService) {
        super();
    }

    async findById(id: number): Promise<ShippingMethod | null> {
        return this.prisma.shippingMethod.findUnique({
            where: { id },
        });
    }

    async findAll(): Promise<ShippingMethod[]> {
        return this.prisma.shippingMethod.findMany({
            orderBy: { sortOrder: 'asc' },
        });
    }

    async create(data: Partial<ShippingMethod>): Promise<ShippingMethod> {
        return this.prisma.shippingMethod.create({
            data: data as Prisma.ShippingMethodCreateInput,
        });
    }

    async update(id: number, data: Partial<ShippingMethod>): Promise<ShippingMethod> {
        return this.prisma.shippingMethod.update({
            where: { id },
            data: data as Prisma.ShippingMethodUpdateInput,
        });
    }

    async delete(id: number): Promise<void> {
        await this.prisma.shippingMethod.delete({
            where: { id },
        });
    }

    async findWithFilters(options: QueryOptions): Promise<PaginatedResult<ShippingMethod>> {
        const { filters = {}, sort, pagination = { page: 1, limit: 10 } } = options;
        const { page, limit } = pagination;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (filters.isActive !== undefined) {
            where.isActive = filters.isActive;
        }
        if (filters.type) {
            where.type = filters.type;
        }

        const [data, total] = await Promise.all([
            this.prisma.shippingMethod.findMany({
                where,
                skip,
                take: limit,
                orderBy: sort ? { [sort.field]: sort.order } : { sortOrder: 'asc' },
            }),
            this.prisma.shippingMethod.count({ where }),
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

    async search(query: string, fields: string[]): Promise<ShippingMethod[]> {
        return this.prisma.shippingMethod.findMany({
            where: {
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { code: { contains: query, mode: 'insensitive' } },
                    { description: { contains: query, mode: 'insensitive' } },
                ],
            },
            orderBy: { sortOrder: 'asc' },
        });
    }

    async countTotal(filters?: FilterOptions): Promise<number> {
        return this.prisma.shippingMethod.count({
            where: filters,
        });
    }

    // Shipping-specific methods
    async findByCode(code: string): Promise<ShippingMethod | null> {
        return this.prisma.shippingMethod.findUnique({
            where: { code },
        });
    }

    async findActive(): Promise<ShippingMethod[]> {
        return this.prisma.shippingMethod.findMany({
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
        });
    }
}

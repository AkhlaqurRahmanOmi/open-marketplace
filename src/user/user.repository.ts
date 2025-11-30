import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/shared/repository/base.repository';
import { User } from '@prisma/client';
import { PrismaService } from 'src/core/config/prisma/prisma.service';
import { FilterOptions, PaginatedResult, QueryOptions } from 'src/shared/types';
import { UserWithRoles } from './types/user-with-relations.type';

@Injectable()
export class UserRepository extends BaseRepository<User, number> {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findById(id: number): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findAll(): Promise<User[]> {
    return this.prisma.user.findMany();
  }

  async create(data: Partial<User>): Promise<User> {
    return this.prisma.user.create({
      data: data as any,
    });
  }

  async update(id: number, data: Partial<User>): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.user.delete({
      where: { id },
    });
  }

  async findWithFilters(options: QueryOptions): Promise<PaginatedResult<User>> {
    const { pagination, filters, sort } = options;
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 10;
    const skip = (page - 1) * limit;

    // Convert SortOptions to Prisma orderBy format
    const orderBy = sort
      ? { [sort.field]: sort.order }
      : undefined;

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where: filters,
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.user.count({
        where: filters,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async search(query: string, fields: string[]): Promise<User[]> {
    const orConditions = fields.map((field) => ({
      [field]: {
        contains: query,
        mode: 'insensitive' as const,
      },
    }));

    return this.prisma.user.findMany({
      where: {
        OR: orConditions,
      },
    });
  }

  async countTotal(filters?: FilterOptions): Promise<number> {
    return this.prisma.user.count({
      where: filters,
    });
  }

  /**
   * Custom method: Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Custom method: Find user by Google ID
   */
  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { googleId },
    });
  }

  /**
   * Custom method: Check if user exists by email
   */
  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { email },
    });
    return count > 0;
  }

  /**
   * Custom method: Find user with roles
   */
  async findByIdWithRoles(id: number): Promise<UserWithRoles | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    }) as Promise<UserWithRoles | null>;
  }

  /**
   * Custom method: Find user with organizations
   * Used for multi-vendor context and organization switching
   */
  async findByIdWithOrganizations(id: number): Promise<any | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        organizationUsers: {
          include: {
            organization: true,
          },
        },
      },
    });
  }

  /**
   * Custom method: Find user with both roles and organizations
   * Used for complete user context in multi-vendor system
   */
  async findByIdWithRolesAndOrganizations(id: number): Promise<any | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
        organizationUsers: {
          include: {
            organization: true,
          },
        },
      },
    });
  }
}

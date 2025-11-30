import { Injectable } from '@nestjs/common';
import { Organization, Prisma } from '@prisma/client';
import { PrismaService } from 'src/core/config/prisma/prisma.service';
import {
  PaginatedResult,
  QueryOptions,
  FilterOptions,
} from 'src/shared/types';

// Type alias for create input
export type OrganizationCreateInput = Prisma.OrganizationCreateInput;

// Type for organization with relations - prevents N+1 queries
export type OrganizationWithRelations = Organization & {
  organizationUsers?: {
    id: number;
    userId: number;
    roleId: number;
    isActive: boolean;
    user: {
      id: number;
      email: string;
      firstName: string | null;
      lastName: string | null;
    };
    role: {
      id: number;
      name: string;
    };
  }[];
  documents?: {
    id: number;
    type: string;
    status: string;
    fileUrl: string;
    fileName: string;
  }[];
  organizationSettings?: {
    id: number;
    notificationEmail: string | null;
    timezone: string | null;
    language: string;
  } | null;
  organizationAttributes?: {
    id: number;
    key: string;
    valueType: string;
    valueString: string | null;
    valueNumber: number | null;
    valueBoolean: boolean | null;
    valueJson: any | null;
    arrayItems: {
      value: string;
      position: number;
    }[];
  }[];
  _count?: {
    organizationUsers: number;
    products: number;
    documents: number;
  };
};

@Injectable()
export class OrganizationRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Optimized include for common queries - avoids N+1
  private readonly baseInclude = {
    _count: {
      select: {
        organizationUsers: true,
        products: true,
        documents: true,
      },
    },
  };

  private readonly detailedInclude = {
    organizationUsers: {
      where: { isActive: true },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    },
    documents: {
      select: {
        id: true,
        type: true,
        status: true,
        fileUrl: true,
        fileName: true,
      },
    },
    organizationSettings: {
      select: {
        id: true,
        notificationEmail: true,
        timezone: true,
        language: true,
      },
    },
    organizationAttributes: {
      include: {
        arrayItems: true,
      },
    },
    _count: {
      select: {
        organizationUsers: true,
        products: true,
        documents: true,
      },
    },
  };

  async findById(id: number): Promise<OrganizationWithRelations | null> {
    return this.prisma.organization.findUnique({
      where: { id },
      include: this.detailedInclude,
    });
  }

  async findByIdBasic(id: number): Promise<Organization | null> {
    return this.prisma.organization.findUnique({
      where: { id },
    });
  }

  async findBySlug(slug: string): Promise<OrganizationWithRelations | null> {
    return this.prisma.organization.findUnique({
      where: { slug },
      include: this.detailedInclude,
    });
  }

  async findByEmail(email: string): Promise<Organization | null> {
    return this.prisma.organization.findUnique({
      where: { email },
    });
  }

  async findAll(): Promise<Organization[]> {
    return this.prisma.organization.findMany({
      include: this.baseInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: Prisma.OrganizationCreateInput): Promise<Organization> {
    return this.prisma.organization.create({
      data,
      include: this.baseInclude,
    });
  }

  async update(id: number, data: Prisma.OrganizationUpdateInput): Promise<Organization> {
    return this.prisma.organization.update({
      where: { id },
      data,
      include: this.baseInclude,
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.organization.delete({
      where: { id },
    });
  }

  // Optimized filter query with single database call
  async findWithFilters(options: QueryOptions): Promise<PaginatedResult<Organization>> {
    const { filters = {}, sort, pagination } = options;
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.OrganizationWhereInput = this.buildWhereClause(filters);

    // Execute count and find in parallel
    const [data, totalItems] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        include: this.baseInclude,
        orderBy: sort ? { [sort.field]: sort.order } : { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.organization.count({ where }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  // Optimized search with text matching
  async search(query: string, fields: string[] = ['name', 'email']): Promise<Organization[]> {
    const orConditions = fields.map((field) => ({
      [field]: { contains: query, mode: 'insensitive' as const },
    }));

    return this.prisma.organization.findMany({
      where: { OR: orConditions },
      include: this.baseInclude,
      take: 50,
    });
  }

  async countTotal(filters?: FilterOptions): Promise<number> {
    const where = filters ? this.buildWhereClause(filters) : {};
    return this.prisma.organization.count({ where });
  }

  // Get organizations by type with counts
  async findByType(type: string, options?: { page?: number; limit?: number }): Promise<PaginatedResult<Organization>> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.OrganizationWhereInput = { type, isActive: true };

    const [data, totalItems] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        include: this.baseInclude,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.organization.count({ where }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  // Get pending organizations for admin approval
  async findPendingApproval(options?: { page?: number; limit?: number }): Promise<PaginatedResult<Organization>> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.OrganizationWhereInput = { status: 'pending_approval' };

    const [data, totalItems] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        include: this.detailedInclude,
        orderBy: { createdAt: 'asc' }, // Oldest first
        skip,
        take: limit,
      }),
      this.prisma.organization.count({ where }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  // Get organizations for a user (all orgs they belong to)
  async findByUserId(userId: number): Promise<OrganizationWithRelations[]> {
    const orgs = await this.prisma.organization.findMany({
      where: {
        organizationUsers: {
          some: {
            userId,
            isActive: true,
          },
        },
      },
      include: {
        ...this.baseInclude,
        organizationUsers: {
          where: { userId, isActive: true },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
            role: { select: { id: true, name: true } },
          },
        },
      },
    });
    return orgs as OrganizationWithRelations[];
  }

  // Check if slug exists
  async slugExists(slug: string, excludeId?: number): Promise<boolean> {
    const count = await this.prisma.organization.count({
      where: {
        slug,
        ...(excludeId && { id: { not: excludeId } }),
      },
    });
    return count > 0;
  }

  // Check if email exists
  async emailExists(email: string, excludeId?: number): Promise<boolean> {
    const count = await this.prisma.organization.count({
      where: {
        email,
        ...(excludeId && { id: { not: excludeId } }),
      },
    });
    return count > 0;
  }

  private buildWhereClause(filters: FilterOptions): Prisma.OrganizationWhereInput {
    const where: Prisma.OrganizationWhereInput = {};

    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;
    if (filters.city) where.city = { contains: filters.city, mode: 'insensitive' };
    if (filters.state) where.state = { contains: filters.state, mode: 'insensitive' };
    if (filters.country) where.country = filters.country;
    if (typeof filters.isActive === 'boolean') where.isActive = filters.isActive;

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { slug: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }
}


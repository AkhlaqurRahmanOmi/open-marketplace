import { Injectable } from '@nestjs/common';
import { OrganizationUser, Prisma } from '@prisma/client';
import { PrismaService } from 'src/core/config/prisma/prisma.service';
import { PaginatedResult } from 'src/shared/types';

// Type for organization user with relations
export type OrganizationUserWithRelations = OrganizationUser & {
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
  organization: {
    id: number;
    name: string;
    slug: string;
    type: string;
    status: string;
  };
  customPermissions?: { permission: string }[];
};

@Injectable()
export class OrganizationUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Optimized include for user queries
  private readonly detailedInclude = {
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
    organization: {
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        status: true,
      },
    },
    customPermissions: {
      select: { permission: true },
    },
  };

  async findById(id: number): Promise<OrganizationUserWithRelations | null> {
    return this.prisma.organizationUser.findUnique({
      where: { id },
      include: this.detailedInclude,
    });
  }

  async findByUserAndOrg(userId: number, organizationId: number): Promise<OrganizationUserWithRelations | null> {
    return this.prisma.organizationUser.findUnique({
      where: {
        userId_organizationId: { userId, organizationId },
      },
      include: this.detailedInclude,
    });
  }

  async findByOrganization(
    organizationId: number,
    options?: { page?: number; limit?: number; isActive?: boolean; search?: string }
  ): Promise<PaginatedResult<OrganizationUserWithRelations>> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.OrganizationUserWhereInput = {
      organizationId,
      ...(typeof options?.isActive === 'boolean' && { isActive: options.isActive }),
      ...(options?.search && {
        user: {
          OR: [
            { email: { contains: options.search, mode: 'insensitive' } },
            { firstName: { contains: options.search, mode: 'insensitive' } },
            { lastName: { contains: options.search, mode: 'insensitive' } },
          ],
        },
      }),
    };

    // Parallel queries for count and data
    const [data, totalItems] = await Promise.all([
      this.prisma.organizationUser.findMany({
        where,
        include: this.detailedInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.organizationUser.count({ where }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: data as OrganizationUserWithRelations[],
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

  async findByUser(userId: number): Promise<OrganizationUserWithRelations[]> {
    return this.prisma.organizationUser.findMany({
      where: { userId, isActive: true },
      include: this.detailedInclude,
    }) as Promise<OrganizationUserWithRelations[]>;
  }

  async create(data: Prisma.OrganizationUserCreateInput): Promise<OrganizationUserWithRelations> {
    return this.prisma.organizationUser.create({
      data,
      include: this.detailedInclude,
    }) as Promise<OrganizationUserWithRelations>;
  }

  async update(id: number, data: Prisma.OrganizationUserUpdateInput): Promise<OrganizationUserWithRelations> {
    return this.prisma.organizationUser.update({
      where: { id },
      data,
      include: this.detailedInclude,
    }) as Promise<OrganizationUserWithRelations>;
  }

  async delete(id: number): Promise<void> {
    await this.prisma.organizationUser.delete({
      where: { id },
    });
  }

  async deactivate(id: number): Promise<OrganizationUserWithRelations> {
    return this.prisma.organizationUser.update({
      where: { id },
      data: { isActive: false },
      include: this.detailedInclude,
    }) as Promise<OrganizationUserWithRelations>;
  }

  async activate(id: number): Promise<OrganizationUserWithRelations> {
    return this.prisma.organizationUser.update({
      where: { id },
      data: { isActive: true, joinedAt: new Date() },
      include: this.detailedInclude,
    }) as Promise<OrganizationUserWithRelations>;
  }

  // Check if user is member of organization
  async isMember(userId: number, organizationId: number): Promise<boolean> {
    const count = await this.prisma.organizationUser.count({
      where: { userId, organizationId, isActive: true },
    });
    return count > 0;
  }

  // Get user's role in organization
  async getUserRole(userId: number, organizationId: number): Promise<string | null> {
    const orgUser = await this.prisma.organizationUser.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
      include: { role: { select: { name: true } } },
    });
    return orgUser?.role?.name || null;
  }

  // Count members in organization
  async countMembers(organizationId: number, activeOnly: boolean = true): Promise<number> {
    return this.prisma.organizationUser.count({
      where: {
        organizationId,
        ...(activeOnly && { isActive: true }),
      },
    });
  }

  // Update custom permissions
  async updateCustomPermissions(
    organizationUserId: number,
    permissions: string[]
  ): Promise<void> {
    await this.prisma.$transaction([
      // Delete existing permissions
      this.prisma.organizationUserPermission.deleteMany({
        where: { organizationUserId },
      }),
      // Create new permissions
      this.prisma.organizationUserPermission.createMany({
        data: permissions.map((permission) => ({
          organizationUserId,
          permission,
        })),
      }),
    ]);
  }

  // Get all permissions for a user in an organization (role + custom)
  async getUserPermissions(userId: number, organizationId: number): Promise<string[]> {
    const orgUser = await this.prisma.organizationUser.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: { select: { name: true } },
              },
            },
          },
        },
        customPermissions: { select: { permission: true } },
      },
    });

    if (!orgUser) return [];

    const rolePermissions = orgUser.role?.rolePermissions?.map((rp) => rp.permission.name) || [];
    const customPermissions = orgUser.customPermissions?.map((p) => p.permission) || [];

    // Combine and deduplicate
    return [...new Set([...rolePermissions, ...customPermissions])];
  }

  // Update last access time
  async updateLastAccess(userId: number, organizationId: number): Promise<void> {
    await this.prisma.organizationUser.update({
      where: { userId_organizationId: { userId, organizationId } },
      data: { lastAccessAt: new Date() },
    });
  }
}


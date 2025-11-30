import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../../core/config/prisma/prisma.service';
import { BaseRepository } from '../../shared/repository/base.repository';
import {
  RoleWithPermissions,
  RoleWithUsers,
  RoleWithRelations,
} from '../types/role-with-relations.type';

@Injectable()
export class RoleRepository extends BaseRepository<Role, number> {
  constructor(protected readonly prisma: PrismaService) {
    super();
  }

  /**
   * Find role by ID
   */
  async findById(id: number): Promise<Role | null> {
    return this.prisma.role.findUnique({
      where: { id },
    });
  }

  /**
   * Find role by name
   */
  async findByName(name: string): Promise<Role | null> {
    return this.prisma.role.findUnique({
      where: { name },
    });
  }

  /**
   * Find role by ID with permissions
   */
  async findByIdWithPermissions(id: number): Promise<RoleWithPermissions | null> {
    return this.prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    }) as Promise<RoleWithPermissions | null>;
  }

  /**
   * Find role by name with permissions
   */
  async findByNameWithPermissions(name: string): Promise<RoleWithPermissions | null> {
    return this.prisma.role.findUnique({
      where: { name },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    }) as Promise<RoleWithPermissions | null>;
  }

  /**
   * Find role with all relations
   */
  async findByIdWithRelations(id: number): Promise<RoleWithRelations | null> {
    return this.prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        userRoles: true,
        organizationUsers: true,
      },
    }) as Promise<RoleWithRelations | null>;
  }

  /**
   * Find all roles
   */
  async findAll(): Promise<Role[]> {
    return this.prisma.role.findMany({
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Find all roles with permissions
   */
  async findAllWithPermissions(): Promise<RoleWithPermissions[]> {
    return this.prisma.role.findMany({
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    }) as Promise<RoleWithPermissions[]>;
  }

  /**
   * Find roles by scope
   */
  async findByScope(scope: 'platform' | 'organization'): Promise<Role[]> {
    return this.prisma.role.findMany({
      where: { scope },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Find roles by scope with permissions
   */
  async findByScopeWithPermissions(
    scope: 'platform' | 'organization',
  ): Promise<RoleWithPermissions[]> {
    return this.prisma.role.findMany({
      where: { scope },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    }) as Promise<RoleWithPermissions[]>;
  }

  /**
   * Create a new role
   */
  async create(data: {
    name: string;
    description?: string;
    scope: 'platform' | 'organization';
  }): Promise<Role> {
    return this.prisma.role.create({
      data,
    });
  }

  /**
   * Update a role
   */
  async update(
    id: number,
    data: {
      name?: string;
      description?: string;
      scope?: 'platform' | 'organization';
    },
  ): Promise<Role> {
    return this.prisma.role.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete a role
   */
  async delete(id: number): Promise<void> {
    await this.prisma.role.delete({
      where: { id },
    });
  }

  /**
   * Assign permissions to a role
   */
  async assignPermissions(roleId: number, permissionIds: number[]): Promise<void> {
    // Delete existing permissions
    await this.prisma.rolePermission.deleteMany({
      where: { roleId },
    });

    // Create new permission assignments
    await this.prisma.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({
        roleId,
        permissionId,
      })),
    });
  }

  /**
   * Add a single permission to a role
   */
  async addPermission(roleId: number, permissionId: number): Promise<void> {
    await this.prisma.rolePermission.create({
      data: {
        roleId,
        permissionId,
      },
    });
  }

  /**
   * Remove a single permission from a role
   */
  async removePermission(roleId: number, permissionId: number): Promise<void> {
    await this.prisma.rolePermission.delete({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId,
        },
      },
    });
  }

  /**
   * Check if role has permission
   */
  async hasPermission(roleId: number, permissionId: number): Promise<boolean> {
    const rolePermission = await this.prisma.rolePermission.findUnique({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId,
        },
      },
    });

    return !!rolePermission;
  }

  /**
   * Count total roles
   */
  async countTotal(): Promise<number> {
    return this.prisma.role.count();
  }

  /**
   * Check if role is assigned to any user
   */
  async isAssignedToUsers(roleId: number): Promise<boolean> {
    const count = await this.prisma.userRole.count({
      where: { roleId },
    });

    return count > 0;
  }

  /**
   * Get role usage statistics
   */
  async getRoleStats(roleId: number): Promise<{
    userCount: number;
    organizationUserCount: number;
    permissionCount: number;
  }> {
    const [userCount, organizationUserCount, permissionCount] = await Promise.all([
      this.prisma.userRole.count({ where: { roleId } }),
      this.prisma.organizationUser.count({ where: { roleId } }),
      this.prisma.rolePermission.count({ where: { roleId } }),
    ]);

    return {
      userCount,
      organizationUserCount,
      permissionCount,
    };
  }

  // Required by BaseRepository
  async findWithFilters(options: any): Promise<any> {
    return this.prisma.role.findMany({
      where: options.where,
      skip: options.skip,
      take: options.take,
      orderBy: options.orderBy,
    });
  }

  async search(query: string, fields: string[]): Promise<Role[]> {
    return this.prisma.role.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
    });
  }
}

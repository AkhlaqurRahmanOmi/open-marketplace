import { Injectable } from '@nestjs/common';
import { Permission } from '@prisma/client';
import { PrismaService } from '../../core/config/prisma/prisma.service';
import { BaseRepository } from '../../shared/repository/base.repository';
import { PermissionWithRoleCount } from '../types/role-with-relations.type';

@Injectable()
export class PermissionRepository extends BaseRepository<Permission, number> {
  constructor(protected readonly prisma: PrismaService) {
    super();
  }

  /**
   * Find permission by ID
   */
  async findById(id: number): Promise<Permission | null> {
    return this.prisma.permission.findUnique({
      where: { id },
    });
  }

  /**
   * Find permission by name
   */
  async findByName(name: string): Promise<Permission | null> {
    return this.prisma.permission.findUnique({
      where: { name },
    });
  }

  /**
   * Find permission by resource, action, and scope
   */
  async findByResourceActionScope(
    resource: string,
    action: string,
    scope: 'platform' | 'organization',
  ): Promise<Permission | null> {
    return this.prisma.permission.findUnique({
      where: {
        resource_action_scope: {
          resource,
          action,
          scope,
        },
      },
    });
  }

  /**
   * Find all permissions
   */
  async findAll(): Promise<Permission[]> {
    return this.prisma.permission.findMany({
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    });
  }

  /**
   * Find all permissions with role count
   */
  async findAllWithRoleCount(): Promise<PermissionWithRoleCount[]> {
    return this.prisma.permission.findMany({
      include: {
        _count: {
          select: {
            rolePermissions: true,
          },
        },
      },
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    }) as Promise<PermissionWithRoleCount[]>;
  }

  /**
   * Find permissions by resource
   */
  async findByResource(resource: string): Promise<Permission[]> {
    return this.prisma.permission.findMany({
      where: { resource },
      orderBy: { action: 'asc' },
    });
  }

  /**
   * Find permissions by scope
   */
  async findByScope(scope: 'platform' | 'organization'): Promise<Permission[]> {
    return this.prisma.permission.findMany({
      where: { scope },
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    });
  }

  /**
   * Find permissions by role ID
   */
  async findByRoleId(roleId: number): Promise<Permission[]> {
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { roleId },
      include: { permission: true },
    });

    return rolePermissions.map((rp) => rp.permission);
  }

  /**
   * Get unique resources
   */
  async getUniqueResources(): Promise<string[]> {
    const permissions = await this.prisma.permission.findMany({
      select: { resource: true },
      distinct: ['resource'],
      orderBy: { resource: 'asc' },
    });

    return permissions.map((p) => p.resource);
  }

  /**
   * Get unique actions
   */
  async getUniqueActions(): Promise<string[]> {
    const permissions = await this.prisma.permission.findMany({
      select: { action: true },
      distinct: ['action'],
      orderBy: { action: 'asc' },
    });

    return permissions.map((p) => p.action);
  }

  /**
   * Create a new permission
   */
  async create(data: {
    name: string;
    description?: string;
    resource: string;
    action: string;
    scope: 'platform' | 'organization';
  }): Promise<Permission> {
    return this.prisma.permission.create({
      data,
    });
  }

  /**
   * Update a permission
   */
  async update(
    id: number,
    data: {
      name?: string;
      description?: string;
      resource?: string;
      action?: string;
      scope?: 'platform' | 'organization';
    },
  ): Promise<Permission> {
    return this.prisma.permission.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete a permission
   */
  async delete(id: number): Promise<void> {
    await this.prisma.permission.delete({
      where: { id },
    });
  }

  /**
   * Count total permissions
   */
  async countTotal(): Promise<number> {
    return this.prisma.permission.count();
  }

  /**
   * Check if permission is assigned to any role
   */
  async isAssignedToRoles(permissionId: number): Promise<boolean> {
    const count = await this.prisma.rolePermission.count({
      where: { permissionId },
    });

    return count > 0;
  }

  /**
   * Get permission statistics
   */
  async getPermissionStats(permissionId: number): Promise<{
    roleCount: number;
  }> {
    const roleCount = await this.prisma.rolePermission.count({
      where: { permissionId },
    });

    return { roleCount };
  }

  /**
   * Bulk create permissions
   */
  async createMany(
    permissions: Array<{
      name: string;
      description?: string;
      resource: string;
      action: string;
      scope: 'platform' | 'organization';
    }>,
  ): Promise<number> {
    const result = await this.prisma.permission.createMany({
      data: permissions,
      skipDuplicates: true,
    });

    return result.count;
  }

  // Required by BaseRepository
  async findWithFilters(options: any): Promise<any> {
    return this.prisma.permission.findMany({
      where: options.where,
      skip: options.skip,
      take: options.take,
      orderBy: options.orderBy,
    });
  }

  async search(query: string, fields: string[]): Promise<Permission[]> {
    return this.prisma.permission.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { resource: { contains: query, mode: 'insensitive' } },
          { action: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
    });
  }
}

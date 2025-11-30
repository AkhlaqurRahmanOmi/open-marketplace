import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { RoleRepository } from '../repositories/role.repository';
import { PermissionRepository } from '../repositories/permission.repository';
import { PrismaService } from '../../core/config/prisma/prisma.service';
import { UnitOfWorkService } from '../../shared/services/unit-of-work.service';
import { CreateRoleDto } from '../dtos/create-role.dto';
import { UpdateRoleDto } from '../dtos/update-role.dto';
import { AssignPermissionsDto } from '../dtos/assign-permissions.dto';
import {
  RoleWithPermissions,
  RoleWithRelations,
} from '../types/role-with-relations.type';

@Injectable()
export class RoleManagementProvider {
  constructor(
    private readonly roleRepository: RoleRepository,
    private readonly permissionRepository: PermissionRepository,
    private readonly prisma: PrismaService,
    private readonly unitOfWork: UnitOfWorkService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Create a new role
   */
  async createRole(dto: CreateRoleDto) {
    // Check if role with same name already exists
    const existingRole = await this.roleRepository.findByName(dto.name);

    if (existingRole) {
      throw new ConflictException(`Role with name '${dto.name}' already exists`);
    }

    const role = await this.roleRepository.create({
      name: dto.name,
      description: dto.description,
      scope: dto.scope,
    });

    return {
      message: 'Role created successfully',
      role,
    };
  }

  /**
   * Update an existing role
   */
  async updateRole(roleId: number, dto: UpdateRoleDto) {
    const role = await this.roleRepository.findById(roleId);

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    // If updating name, check for conflicts
    if (dto.name && dto.name !== role.name) {
      const existingRole = await this.roleRepository.findByName(dto.name);

      if (existingRole) {
        throw new ConflictException(`Role with name '${dto.name}' already exists`);
      }
    }

    const updatedRole = await this.roleRepository.update(roleId, dto);

    // Invalidate cache for users with this role
    await this.invalidateRoleCaches(roleId);

    return {
      message: 'Role updated successfully',
      role: updatedRole,
    };
  }

  /**
   * Delete a role
   */
  async deleteRole(roleId: number) {
    const role = await this.roleRepository.findById(roleId);

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    // Check if role is assigned to any user
    const isAssigned = await this.roleRepository.isAssignedToUsers(roleId);

    if (isAssigned) {
      throw new BadRequestException(
        'Cannot delete role that is assigned to users. Please reassign users first.',
      );
    }

    await this.roleRepository.delete(roleId);

    return {
      message: `Role '${role.name}' deleted successfully`,
    };
  }

  /**
   * Get all roles
   */
  async getAllRoles(): Promise<RoleWithPermissions[]> {
    return this.roleRepository.findAllWithPermissions();
  }

  /**
   * Get roles by scope
   */
  async getRolesByScope(scope: 'platform' | 'organization'): Promise<RoleWithPermissions[]> {
    return this.roleRepository.findByScopeWithPermissions(scope);
  }

  /**
   * Get role by ID
   */
  async getRoleById(roleId: number): Promise<RoleWithRelations> {
    const role = await this.roleRepository.findByIdWithRelations(roleId);

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    return role;
  }

  /**
   * Get role by name
   */
  async getRoleByName(name: string): Promise<RoleWithPermissions> {
    const role = await this.roleRepository.findByNameWithPermissions(name);

    if (!role) {
      throw new NotFoundException(`Role '${name}' not found`);
    }

    return role;
  }

  /**
   * Assign permissions to a role
   */
  async assignPermissions(roleId: number, dto: AssignPermissionsDto) {
    const role = await this.roleRepository.findById(roleId);

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    // Verify all permissions exist
    const permissions = await Promise.all(
      dto.permissionIds.map((id) => this.permissionRepository.findById(id)),
    );

    const missingPermissions = dto.permissionIds.filter(
      (id, index) => !permissions[index],
    );

    if (missingPermissions.length > 0) {
      throw new NotFoundException(
        `Permissions not found: ${missingPermissions.join(', ')}`,
      );
    }

    await this.roleRepository.assignPermissions(roleId, dto.permissionIds);

    // Invalidate cache for users with this role
    await this.invalidateRoleCaches(roleId);

    return {
      message: `${dto.permissionIds.length} permissions assigned to role '${role.name}'`,
    };
  }

  /**
   * Add a single permission to a role
   */
  async addPermission(roleId: number, permissionId: number) {
    const role = await this.roleRepository.findById(roleId);

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    const permission = await this.permissionRepository.findById(permissionId);

    if (!permission) {
      throw new NotFoundException(`Permission with ID ${permissionId} not found`);
    }

    // Check if already assigned
    const hasPermission = await this.roleRepository.hasPermission(roleId, permissionId);

    if (hasPermission) {
      throw new ConflictException(
        `Permission '${permission.name}' is already assigned to role '${role.name}'`,
      );
    }

    await this.roleRepository.addPermission(roleId, permissionId);

    // Invalidate cache
    await this.invalidateRoleCaches(roleId);

    return {
      message: `Permission '${permission.name}' added to role '${role.name}'`,
    };
  }

  /**
   * Remove a single permission from a role
   */
  async removePermission(roleId: number, permissionId: number) {
    const role = await this.roleRepository.findById(roleId);

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    const permission = await this.permissionRepository.findById(permissionId);

    if (!permission) {
      throw new NotFoundException(`Permission with ID ${permissionId} not found`);
    }

    // Check if assigned
    const hasPermission = await this.roleRepository.hasPermission(roleId, permissionId);

    if (!hasPermission) {
      throw new BadRequestException(
        `Permission '${permission.name}' is not assigned to role '${role.name}'`,
      );
    }

    await this.roleRepository.removePermission(roleId, permissionId);

    // Invalidate cache
    await this.invalidateRoleCaches(roleId);

    return {
      message: `Permission '${permission.name}' removed from role '${role.name}'`,
    };
  }

  /**
   * Get role permissions
   */
  async getRolePermissions(roleId: number) {
    const role = await this.roleRepository.findByIdWithPermissions(roleId);

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    return role.rolePermissions.map((rp) => rp.permission);
  }

  /**
   * Get role statistics
   */
  async getRoleStats(roleId: number) {
    const role = await this.roleRepository.findById(roleId);

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    const stats = await this.roleRepository.getRoleStats(roleId);

    return {
      role,
      stats,
    };
  }

  /**
   * Assign role to user
   */
  async assignRoleToUser(userId: number, roleName: string) {
    // Validate user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Validate role exists
    const role = await this.roleRepository.findByName(roleName);

    if (!role) {
      throw new NotFoundException(`Role '${roleName}' not found`);
    }

    // Check if user already has this role
    const existingUserRole = await this.prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId,
          roleId: role.id,
        },
      },
    });

    if (existingUserRole) {
      throw new ConflictException(
        `User already has role '${roleName}'`,
      );
    }

    // Use Unit of Work transaction to replace user's role
    await this.unitOfWork.transaction(async (tx) => {
      // Delete all existing roles for this user
      await tx.userRole.deleteMany({
        where: { userId },
      });

      // Create new role assignment
      await tx.userRole.create({
        data: {
          userId,
          roleId: role.id,
        },
      });
    });

    // Invalidate user cache
    await this.invalidateUserCache(userId);

    return {
      message: `Role '${roleName}' assigned to user successfully`,
    };
  }

  /**
   * Remove role from user
   */
  async removeRoleFromUser(userId: number, roleName: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const role = await this.roleRepository.findByName(roleName);

    if (!role) {
      throw new NotFoundException(`Role '${roleName}' not found`);
    }

    // Check if user has this role
    const userRole = await this.prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId,
          roleId: role.id,
        },
      },
    });

    if (!userRole) {
      throw new BadRequestException(
        `User does not have role '${roleName}'`,
      );
    }

    await this.prisma.userRole.delete({
      where: {
        userId_roleId: {
          userId,
          roleId: role.id,
        },
      },
    });

    // Invalidate user cache
    await this.invalidateUserCache(userId);

    return {
      message: `Role '${roleName}' removed from user successfully`,
    };
  }

  /**
   * Get user roles
   */
  async getUserRoles(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
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
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return user.userRoles.map((ur) => ur.role);
  }

  /**
   * Get user permissions (aggregated from all roles)
   */
  async getUserPermissions(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
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
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Aggregate unique permissions from all user's roles
    const permissionsSet = new Set<number>();
    const permissions: any[] = [];

    user.userRoles.forEach((ur) => {
      ur.role.rolePermissions.forEach((rp) => {
        if (!permissionsSet.has(rp.permission.id)) {
          permissionsSet.add(rp.permission.id);
          permissions.push(rp.permission);
        }
      });
    });

    return permissions;
  }

  /**
   * Invalidate cache for all users with this role
   */
  private async invalidateRoleCaches(roleId: number) {
    // Get all users with this role
    const userRoles = await this.prisma.userRole.findMany({
      where: { roleId },
      select: { userId: true },
    });

    // Invalidate cache for each user
    await Promise.all(
      userRoles.map((ur) => this.invalidateUserCache(ur.userId)),
    );
  }

  /**
   * Invalidate user role cache
   */
  private async invalidateUserCache(userId: number) {
    const key = `user_roles_permissions:${userId}`;
    await this.cacheManager.del(key);
  }
}

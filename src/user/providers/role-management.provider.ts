import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/core/config/prisma/prisma.service';
import { UnitOfWorkService } from 'src/shared/services/unit-of-work.service';

/**
 * Provider for managing user roles and permissions
 */
@Injectable()
export class RoleManagementProvider {
  constructor(
    private readonly prisma: PrismaService,
    private readonly unitOfWork: UnitOfWorkService,
  ) {}

  /**
   * Assign a role to a user
   */
  async assignRoleToUser(userId: number, roleName: string) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if role exists
    const role = await this.prisma.role.findUnique({
      where: { name: roleName },
    });

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
      throw new ConflictException('User already has this role');
    }

    // Assign role using Unit of Work
    await this.unitOfWork.transaction(async (tx) => {
      // Delete all existing roles for the user
      await tx.userRole.deleteMany({ where: { userId } });

      // Create new role assignment
      await tx.userRole.create({
        data: {
          userId,
          roleId: role.id,
        },
      });
    });

    return {
      message: `Role '${roleName}' assigned to user successfully`,
      userId,
      roleName,
    };
  }

  /**
   * Remove a role from a user
   */
  async removeRoleFromUser(userId: number, roleName: string) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if role exists
    const role = await this.prisma.role.findUnique({
      where: { name: roleName },
    });

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
      throw new NotFoundException('User does not have this role');
    }

    // Remove role
    await this.prisma.userRole.delete({
      where: {
        userId_roleId: {
          userId,
          roleId: role.id,
        },
      },
    });

    return {
      message: `Role '${roleName}' removed from user successfully`,
      userId,
      roleName,
    };
  }

  /**
   * Get all roles assigned to a user
   */
  async getUserRoles(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      userId,
      roles: user.userRoles.map((ur) => ({
        id: ur.role.id,
        name: ur.role.name,
        description: ur.role.description,
        assignedAt: ur.assignedAt,
      })),
    };
  }

  /**
   * Get all available roles
   */
  async getAllRoles() {
    const roles = await this.prisma.role.findMany({
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.rolePermissions.map((rp) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        description: rp.permission.description,
      })),
    }));
  }

  /**
   * Get user's permissions (from all assigned roles)
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
      throw new NotFoundException('User not found');
    }

    // Collect all unique permissions from all roles
    const permissionsMap = new Map();

    user.userRoles.forEach((userRole) => {
      userRole.role.rolePermissions.forEach((rp) => {
        if (!permissionsMap.has(rp.permission.name)) {
          permissionsMap.set(rp.permission.name, {
            id: rp.permission.id,
            name: rp.permission.name,
            description: rp.permission.description,
          });
        }
      });
    });

    return {
      userId,
      permissions: Array.from(permissionsMap.values()),
    };
  }
}

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PermissionRepository } from '../repositories/permission.repository';
import { CreatePermissionDto } from '../dtos/create-permission.dto';

@Injectable()
export class PermissionManagementProvider {
  constructor(private readonly permissionRepository: PermissionRepository) {}

  /**
   * Create a new permission
   */
  async createPermission(dto: CreatePermissionDto) {
    // Check if permission with same resource, action, scope exists
    const existingPermission =
      await this.permissionRepository.findByResourceActionScope(
        dto.resource,
        dto.action,
        dto.scope,
      );

    if (existingPermission) {
      throw new ConflictException(
        `Permission with resource '${dto.resource}', action '${dto.action}', and scope '${dto.scope}' already exists`,
      );
    }

    // Check if permission with same name exists
    const existingName = await this.permissionRepository.findByName(dto.name);

    if (existingName) {
      throw new ConflictException(
        `Permission with name '${dto.name}' already exists`,
      );
    }

    const permission = await this.permissionRepository.create(dto);

    return {
      message: 'Permission created successfully',
      permission,
    };
  }

  /**
   * Delete a permission
   */
  async deletePermission(permissionId: number) {
    const permission = await this.permissionRepository.findById(permissionId);

    if (!permission) {
      throw new NotFoundException(
        `Permission with ID ${permissionId} not found`,
      );
    }

    // Check if permission is assigned to any role
    const isAssigned = await this.permissionRepository.isAssignedToRoles(
      permissionId,
    );

    if (isAssigned) {
      throw new BadRequestException(
        'Cannot delete permission that is assigned to roles. Please remove from roles first.',
      );
    }

    await this.permissionRepository.delete(permissionId);

    return {
      message: `Permission '${permission.name}' deleted successfully`,
    };
  }

  /**
   * Get all permissions
   */
  async getAllPermissions() {
    return this.permissionRepository.findAllWithRoleCount();
  }

  /**
   * Get permissions by scope
   */
  async getPermissionsByScope(scope: 'platform' | 'organization') {
    return this.permissionRepository.findByScope(scope);
  }

  /**
   * Get permissions by resource
   */
  async getPermissionsByResource(resource: string) {
    return this.permissionRepository.findByResource(resource);
  }

  /**
   * Get permission by ID
   */
  async getPermissionById(permissionId: number) {
    const permission = await this.permissionRepository.findById(permissionId);

    if (!permission) {
      throw new NotFoundException(
        `Permission with ID ${permissionId} not found`,
      );
    }

    return permission;
  }

  /**
   * Get unique resources
   */
  async getUniqueResources() {
    return this.permissionRepository.getUniqueResources();
  }

  /**
   * Get unique actions
   */
  async getUniqueActions() {
    return this.permissionRepository.getUniqueActions();
  }

  /**
   * Get permission statistics
   */
  async getPermissionStats(permissionId: number) {
    const permission = await this.permissionRepository.findById(permissionId);

    if (!permission) {
      throw new NotFoundException(
        `Permission with ID ${permissionId} not found`,
      );
    }

    const stats = await this.permissionRepository.getPermissionStats(
      permissionId,
    );

    return {
      permission,
      stats,
    };
  }

  /**
   * Bulk create permissions
   */
  async bulkCreatePermissions(permissions: CreatePermissionDto[]) {
    const created = await this.permissionRepository.createMany(permissions);

    return {
      message: `${created} permissions created successfully`,
      count: created,
    };
  }
}

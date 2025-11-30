import { Injectable } from '@nestjs/common';
import { RoleManagementProvider } from './providers/role-management.provider';
import { PermissionManagementProvider } from './providers/permission-management.provider';
import { CreateRoleDto } from './dtos/create-role.dto';
import { UpdateRoleDto } from './dtos/update-role.dto';
import { AssignPermissionsDto } from './dtos/assign-permissions.dto';
import { CreatePermissionDto } from './dtos/create-permission.dto';

/**
 * RBAC Service - Facade pattern
 * Orchestrates role and permission management operations
 */
@Injectable()
export class RbacService {
  constructor(
    private readonly roleManagement: RoleManagementProvider,
    private readonly permissionManagement: PermissionManagementProvider,
  ) {}

  // ============================================
  // Role Management Methods
  // ============================================

  /**
   * Create a new role
   */
  async createRole(dto: CreateRoleDto) {
    return this.roleManagement.createRole(dto);
  }

  /**
   * Update an existing role
   */
  async updateRole(roleId: number, dto: UpdateRoleDto) {
    return this.roleManagement.updateRole(roleId, dto);
  }

  /**
   * Delete a role
   */
  async deleteRole(roleId: number) {
    return this.roleManagement.deleteRole(roleId);
  }

  /**
   * Get all roles
   */
  async getAllRoles() {
    return this.roleManagement.getAllRoles();
  }

  /**
   * Get roles by scope
   */
  async getRolesByScope(scope: 'platform' | 'organization') {
    return this.roleManagement.getRolesByScope(scope);
  }

  /**
   * Get role by ID
   */
  async getRoleById(roleId: number) {
    return this.roleManagement.getRoleById(roleId);
  }

  /**
   * Get role by name
   */
  async getRoleByName(name: string) {
    return this.roleManagement.getRoleByName(name);
  }

  /**
   * Assign permissions to a role
   */
  async assignPermissions(roleId: number, dto: AssignPermissionsDto) {
    return this.roleManagement.assignPermissions(roleId, dto);
  }

  /**
   * Add a single permission to a role
   */
  async addPermission(roleId: number, permissionId: number) {
    return this.roleManagement.addPermission(roleId, permissionId);
  }

  /**
   * Remove a single permission from a role
   */
  async removePermission(roleId: number, permissionId: number) {
    return this.roleManagement.removePermission(roleId, permissionId);
  }

  /**
   * Get role permissions
   */
  async getRolePermissions(roleId: number) {
    return this.roleManagement.getRolePermissions(roleId);
  }

  /**
   * Get role statistics
   */
  async getRoleStats(roleId: number) {
    return this.roleManagement.getRoleStats(roleId);
  }

  // ============================================
  // User Role Assignment Methods
  // ============================================

  /**
   * Assign role to user
   */
  async assignRoleToUser(userId: number, roleName: string) {
    return this.roleManagement.assignRoleToUser(userId, roleName);
  }

  /**
   * Remove role from user
   */
  async removeRoleFromUser(userId: number, roleName: string) {
    return this.roleManagement.removeRoleFromUser(userId, roleName);
  }

  /**
   * Get user roles
   */
  async getUserRoles(userId: number) {
    return this.roleManagement.getUserRoles(userId);
  }

  /**
   * Get user permissions
   */
  async getUserPermissions(userId: number) {
    return this.roleManagement.getUserPermissions(userId);
  }

  // ============================================
  // Permission Management Methods
  // ============================================

  /**
   * Create a new permission
   */
  async createPermission(dto: CreatePermissionDto) {
    return this.permissionManagement.createPermission(dto);
  }

  /**
   * Delete a permission
   */
  async deletePermission(permissionId: number) {
    return this.permissionManagement.deletePermission(permissionId);
  }

  /**
   * Get all permissions
   */
  async getAllPermissions() {
    return this.permissionManagement.getAllPermissions();
  }

  /**
   * Get permissions by scope
   */
  async getPermissionsByScope(scope: 'platform' | 'organization') {
    return this.permissionManagement.getPermissionsByScope(scope);
  }

  /**
   * Get permissions by resource
   */
  async getPermissionsByResource(resource: string) {
    return this.permissionManagement.getPermissionsByResource(resource);
  }

  /**
   * Get permission by ID
   */
  async getPermissionById(permissionId: number) {
    return this.permissionManagement.getPermissionById(permissionId);
  }

  /**
   * Get unique resources
   */
  async getUniqueResources() {
    return this.permissionManagement.getUniqueResources();
  }

  /**
   * Get unique actions
   */
  async getUniqueActions() {
    return this.permissionManagement.getUniqueActions();
  }

  /**
   * Get permission statistics
   */
  async getPermissionStats(permissionId: number) {
    return this.permissionManagement.getPermissionStats(permissionId);
  }

  /**
   * Bulk create permissions
   */
  async bulkCreatePermissions(permissions: CreatePermissionDto[]) {
    return this.permissionManagement.bulkCreatePermissions(permissions);
  }
}

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RbacService } from './rbac.service';
import { Auth } from '../auth/decorator/auth.decorator';
import { AuthType } from '../auth/enums/auth-type.enum';
import { Permissions } from '../auth/decorator/permissions.decorator';
import { CreateRoleDto } from './dtos/create-role.dto';
import { UpdateRoleDto } from './dtos/update-role.dto';
import { AssignPermissionsDto } from './dtos/assign-permissions.dto';
import { AssignRoleDto } from './dtos/assign-role.dto';
import { CreatePermissionDto } from './dtos/create-permission.dto';

@Controller('admin/rbac')
@Auth(AuthType.Bearer)
@Permissions('role.manage', 'permission.manage') // Platform admin only
export class RbacAdminController {
  constructor(private readonly rbacService: RbacService) {}

  // ============================================
  // Role Management
  // ============================================

  /**
   * Create a new role
   */
  @Post('roles')
  @Permissions('role.create')
  @HttpCode(HttpStatus.CREATED)
  async createRole(@Body() dto: CreateRoleDto) {
    return this.rbacService.createRole(dto);
  }

  /**
   * Update a role
   */
  @Patch('roles/:id')
  @Permissions('role.update')
  @HttpCode(HttpStatus.OK)
  async updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.rbacService.updateRole(id, dto);
  }

  /**
   * Delete a role
   */
  @Delete('roles/:id')
  @Permissions('role.delete')
  @HttpCode(HttpStatus.OK)
  async deleteRole(@Param('id', ParseIntPipe) id: number) {
    return this.rbacService.deleteRole(id);
  }

  /**
   * Assign permissions to a role
   */
  @Post('roles/:id/permissions')
  @Permissions('role.update')
  @HttpCode(HttpStatus.OK)
  async assignPermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignPermissionsDto,
  ) {
    return this.rbacService.assignPermissions(id, dto);
  }

  /**
   * Add a single permission to a role
   */
  @Post('roles/:roleId/permissions/:permissionId')
  @Permissions('role.update')
  @HttpCode(HttpStatus.OK)
  async addPermission(
    @Param('roleId', ParseIntPipe) roleId: number,
    @Param('permissionId', ParseIntPipe) permissionId: number,
  ) {
    return this.rbacService.addPermission(roleId, permissionId);
  }

  /**
   * Remove a single permission from a role
   */
  @Delete('roles/:roleId/permissions/:permissionId')
  @Permissions('role.update')
  @HttpCode(HttpStatus.OK)
  async removePermission(
    @Param('roleId', ParseIntPipe) roleId: number,
    @Param('permissionId', ParseIntPipe) permissionId: number,
  ) {
    return this.rbacService.removePermission(roleId, permissionId);
  }

  // ============================================
  // Permission Management
  // ============================================

  /**
   * Create a new permission
   */
  @Post('permissions')
  @Permissions('permission.create')
  @HttpCode(HttpStatus.CREATED)
  async createPermission(@Body() dto: CreatePermissionDto) {
    return this.rbacService.createPermission(dto);
  }

  /**
   * Delete a permission
   */
  @Delete('permissions/:id')
  @Permissions('permission.delete')
  @HttpCode(HttpStatus.OK)
  async deletePermission(@Param('id', ParseIntPipe) id: number) {
    return this.rbacService.deletePermission(id);
  }

  /**
   * Get permission statistics
   */
  @Get('permissions/:id/stats')
  @Permissions('permission.read')
  @HttpCode(HttpStatus.OK)
  async getPermissionStats(@Param('id', ParseIntPipe) id: number) {
    return this.rbacService.getPermissionStats(id);
  }

  /**
   * Bulk create permissions
   */
  @Post('permissions/bulk')
  @Permissions('permission.create')
  @HttpCode(HttpStatus.CREATED)
  async bulkCreatePermissions(@Body() dto: { permissions: CreatePermissionDto[] }) {
    return this.rbacService.bulkCreatePermissions(dto.permissions);
  }

  // ============================================
  // User Role Assignment
  // ============================================

  /**
   * Assign role to user
   */
  @Post('users/:userId/roles')
  @Permissions('role.manage')
  @HttpCode(HttpStatus.OK)
  async assignRoleToUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: AssignRoleDto,
  ) {
    return this.rbacService.assignRoleToUser(userId, dto.roleName);
  }

  /**
   * Remove role from user
   */
  @Delete('users/:userId/roles/:roleName')
  @Permissions('role.manage')
  @HttpCode(HttpStatus.OK)
  async removeRoleFromUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('roleName') roleName: string,
  ) {
    return this.rbacService.removeRoleFromUser(userId, roleName);
  }

  /**
   * Get user roles
   */
  @Get('users/:userId/roles')
  @Permissions('role.read')
  @HttpCode(HttpStatus.OK)
  async getUserRoles(@Param('userId', ParseIntPipe) userId: number) {
    return this.rbacService.getUserRoles(userId);
  }

  /**
   * Get user permissions
   */
  @Get('users/:userId/permissions')
  @Permissions('role.read')
  @HttpCode(HttpStatus.OK)
  async getUserPermissions(@Param('userId', ParseIntPipe) userId: number) {
    return this.rbacService.getUserPermissions(userId);
  }
}

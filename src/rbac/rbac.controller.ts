import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { RbacService } from './rbac.service';
import { Auth } from '../auth/decorator/auth.decorator';
import { AuthType } from '../auth/enums/auth-type.enum';
import { ActiveUser } from '../auth/decorator/active-user.decorator';
import type { ActiveUserData } from '../auth/interfaces/active-user-data.interface';
import { Permissions } from '../auth/decorator/permissions.decorator';

@Controller('rbac')
@Auth(AuthType.Bearer)
export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  // ============================================
  // Role Endpoints
  // ============================================

  /**
   * Get all roles
   */
  @Get('roles')
  @Permissions('role.read')
  @HttpCode(HttpStatus.OK)
  async getAllRoles(@Query('scope') scope?: 'platform' | 'organization') {
    if (scope) {
      return this.rbacService.getRolesByScope(scope);
    }
    return this.rbacService.getAllRoles();
  }

  /**
   * Get role by ID
   */
  @Get('roles/:id')
  @Permissions('role.read')
  @HttpCode(HttpStatus.OK)
  async getRoleById(@Param('id', ParseIntPipe) id: number) {
    return this.rbacService.getRoleById(id);
  }

  /**
   * Get role permissions
   */
  @Get('roles/:id/permissions')
  @Permissions('role.read')
  @HttpCode(HttpStatus.OK)
  async getRolePermissions(@Param('id', ParseIntPipe) id: number) {
    return this.rbacService.getRolePermissions(id);
  }

  /**
   * Get role statistics
   */
  @Get('roles/:id/stats')
  @Permissions('role.read')
  @HttpCode(HttpStatus.OK)
  async getRoleStats(@Param('id', ParseIntPipe) id: number) {
    return this.rbacService.getRoleStats(id);
  }

  // ============================================
  // Permission Endpoints
  // ============================================

  /**
   * Get all permissions
   */
  @Get('permissions')
  @Permissions('permission.read')
  @HttpCode(HttpStatus.OK)
  async getAllPermissions(@Query('scope') scope?: 'platform' | 'organization') {
    if (scope) {
      return this.rbacService.getPermissionsByScope(scope);
    }
    return this.rbacService.getAllPermissions();
  }

  /**
   * Get permission by ID
   */
  @Get('permissions/:id')
  @Permissions('permission.read')
  @HttpCode(HttpStatus.OK)
  async getPermissionById(@Param('id', ParseIntPipe) id: number) {
    return this.rbacService.getPermissionById(id);
  }

  /**
   * Get permissions by resource
   */
  @Get('permissions/resource/:resource')
  @Permissions('permission.read')
  @HttpCode(HttpStatus.OK)
  async getPermissionsByResource(@Param('resource') resource: string) {
    return this.rbacService.getPermissionsByResource(resource);
  }

  /**
   * Get unique resources
   */
  @Get('permissions/metadata/resources')
  @Permissions('permission.read')
  @HttpCode(HttpStatus.OK)
  async getUniqueResources() {
    return this.rbacService.getUniqueResources();
  }

  /**
   * Get unique actions
   */
  @Get('permissions/metadata/actions')
  @Permissions('permission.read')
  @HttpCode(HttpStatus.OK)
  async getUniqueActions() {
    return this.rbacService.getUniqueActions();
  }

  // ============================================
  // User Role Management (Self)
  // ============================================

  /**
   * Get current user's roles
   */
  @Get('me/roles')
  @HttpCode(HttpStatus.OK)
  async getMyRoles(@ActiveUser() user: ActiveUserData) {
    return this.rbacService.getUserRoles(user.sub);
  }

  /**
   * Get current user's permissions
   */
  @Get('me/permissions')
  @HttpCode(HttpStatus.OK)
  async getMyPermissions(@ActiveUser() user: ActiveUserData) {
    return this.rbacService.getUserPermissions(user.sub);
  }
}

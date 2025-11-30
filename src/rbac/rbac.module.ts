import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { RbacController } from './rbac.controller';
import { RbacAdminController } from './rbac-admin.controller';
import { RbacService } from './rbac.service';
import { RoleManagementProvider } from './providers/role-management.provider';
import { PermissionManagementProvider } from './providers/permission-management.provider';
import { RoleRepository } from './repositories/role.repository';
import { PermissionRepository } from './repositories/permission.repository';
import { PrismaModule } from '../core/config/prisma/prisma.module';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [
    PrismaModule,
    SharedModule, // For UnitOfWorkService
    CacheModule.register(),
  ],
  controllers: [RbacController, RbacAdminController],
  providers: [
    RbacService,
    RoleManagementProvider,
    PermissionManagementProvider,
    RoleRepository,
    PermissionRepository,
  ],
  exports: [RbacService], // Only export the service (facade pattern)
})
export class RbacModule {}

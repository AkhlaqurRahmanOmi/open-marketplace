import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';
import { OrganizationModule } from '../organization/organization.module';

/**
 * CoreModule groups core authentication and user management features
 * This includes:
 * - User authentication (login, register, OTP)
 * - User management (CRUD, roles, permissions)
 * - Google authentication
 * - Organization management (multi-vendor support)
 */
@Module({
  imports: [UserModule, AuthModule, OrganizationModule],
  exports: [UserModule, AuthModule, OrganizationModule],
})
export class CoreModule {}

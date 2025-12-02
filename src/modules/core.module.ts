import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';
import { RbacModule } from '../rbac/rbac.module';

/**
 * CoreModule groups core authentication and authorization features
 * This includes:
 * - Authentication (login, register, JWT, OTP, Google OAuth)
 * - User management (CRUD operations)
 * - RBAC (Roles, Permissions, Access Control)
 *
 * Used by: All modules (Platform, Vendor, Customer)
 */
@Module({
  imports: [AuthModule, UserModule, RbacModule],
  exports: [AuthModule, UserModule, RbacModule],
})
export class CoreModule {}

import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/core/config/prisma/prisma.module';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { AttributesModule } from 'src/attributes/attributes.module';

// Controllers
import { OrganizationController } from './organization.controller';
import { OrganizationAdminController } from './organization-admin.controller';

// Service
import { OrganizationService } from './organization.service';

// Providers
import {
  OrganizationManagementProvider,
  OrganizationApprovalProvider,
  OrganizationInvitationProvider,
  OrganizationDocumentProvider,
  OrganizationSettingsProvider,
} from './providers';

// Repositories
import {
  OrganizationRepository,
  OrganizationUserRepository,
  OrganizationDocumentRepository,
  OrganizationSettingsRepository,
} from './repositories';

/**
 * OrganizationModule handles all organization-related functionality:
 * - Organization CRUD operations
 * - Approval workflow (pending, approve, reject, suspend, reactivate)
 * - User invitations and member management
 * - Document uploads and verification
 * - Organization settings management
 */
@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    AttributesModule,
  ],
  controllers: [
    OrganizationController,
    OrganizationAdminController,
  ],
  providers: [
    // Service
    OrganizationService,
    
    // Providers (Business Logic)
    OrganizationManagementProvider,
    OrganizationApprovalProvider,
    OrganizationInvitationProvider,
    OrganizationDocumentProvider,
    OrganizationSettingsProvider,
    
    // Repositories (Data Access)
    OrganizationRepository,
    OrganizationUserRepository,
    OrganizationDocumentRepository,
    OrganizationSettingsRepository,
  ],
  exports: [
    OrganizationService,
    OrganizationRepository,
    OrganizationUserRepository,
  ],
})
export class OrganizationModule {}


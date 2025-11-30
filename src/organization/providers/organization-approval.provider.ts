import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Organization, OrganizationStatus } from '@prisma/client';
import { OrganizationRepository } from '../repositories/organization.repository';
import {
  ApproveOrganizationDto,
  RejectOrganizationDto,
  SuspendOrganizationDto,
  ReactivateOrganizationDto,
} from '../dtos';
import { PaginatedResult } from 'src/shared/types';
import { NotificationsService } from 'src/notifications/notifications.service';
import { NotificationChannel } from 'src/notifications/enums';

@Injectable()
export class OrganizationApprovalProvider {
  private readonly logger = new Logger(OrganizationApprovalProvider.name);

  constructor(
    private readonly organizationRepo: OrganizationRepository,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getPendingOrganizations(
    options?: { page?: number; limit?: number }
  ): Promise<PaginatedResult<Organization>> {
    return this.organizationRepo.findPendingApproval(options);
  }

  async approveOrganization(
    id: number,
    dto: ApproveOrganizationDto,
    approvedBy: number,
  ): Promise<Organization> {
    const organization = await this.organizationRepo.findByIdBasic(id);
    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    if (organization.status !== 'pending_approval') {
      throw new BadRequestException(
        `Organization is not pending approval. Current status: ${organization.status}`
      );
    }

    const updated = await this.organizationRepo.update(id, {
      status: 'active',
      approvedAt: new Date(),
      approvedBy,
      ...(dto.feeType && { feeType: dto.feeType }),
      ...(dto.feeAmount !== undefined && { feeAmount: dto.feeAmount }),
    });

    this.logger.log(`Organization approved: ${id} by user ${approvedBy}`);

    // Send notification to organization owner
    await this.sendApprovalNotification(organization, true);

    return updated;
  }

  async rejectOrganization(
    id: number,
    dto: RejectOrganizationDto,
    rejectedBy: number,
  ): Promise<Organization> {
    const organization = await this.organizationRepo.findByIdBasic(id);
    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    if (organization.status !== 'pending_approval') {
      throw new BadRequestException(
        `Organization is not pending approval. Current status: ${organization.status}`
      );
    }

    const updated = await this.organizationRepo.update(id, {
      status: 'rejected',
      rejectedAt: new Date(),
      rejectionReason: dto.reason,
    });

    this.logger.log(`Organization rejected: ${id} - Reason: ${dto.reason}`);

    // Send notification to organization owner
    await this.sendApprovalNotification(organization, false, dto.reason);

    return updated;
  }

  async suspendOrganization(
    id: number,
    dto: SuspendOrganizationDto,
    suspendedBy: number,
  ): Promise<Organization> {
    const organization = await this.organizationRepo.findByIdBasic(id);
    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    if (organization.status !== 'active') {
      throw new BadRequestException(
        `Only active organizations can be suspended. Current status: ${organization.status}`
      );
    }

    const updated = await this.organizationRepo.update(id, {
      status: 'suspended',
      isActive: false,
      rejectionReason: dto.reason, // Reuse field for suspension reason
    });

    this.logger.log(`Organization suspended: ${id} - Reason: ${dto.reason}`);

    // Send suspension notification
    await this.sendSuspensionNotification(organization, dto.reason);

    return updated;
  }

  async reactivateOrganization(
    id: number,
    dto: ReactivateOrganizationDto,
    reactivatedBy: number,
  ): Promise<Organization> {
    const organization = await this.organizationRepo.findByIdBasic(id);
    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    if (organization.status !== 'suspended') {
      throw new BadRequestException(
        `Only suspended organizations can be reactivated. Current status: ${organization.status}`
      );
    }

    const updated = await this.organizationRepo.update(id, {
      status: 'active',
      isActive: true,
      rejectionReason: null,
    });

    this.logger.log(`Organization reactivated: ${id} by user ${reactivatedBy}`);

    // Send reactivation notification
    await this.sendReactivationNotification(organization);

    return updated;
  }

  async getOrganizationsByStatus(
    status: OrganizationStatus,
    options?: { page?: number; limit?: number }
  ): Promise<PaginatedResult<Organization>> {
    return this.organizationRepo.findWithFilters({
      filters: { status },
      pagination: {
        page: options?.page || 1,
        limit: options?.limit || 20,
      },
    });
  }

  // Get approval statistics
  async getApprovalStats(): Promise<{
    pending: number;
    approved: number;
    rejected: number;
    suspended: number;
  }> {
    const [pending, approved, rejected, suspended] = await Promise.all([
      this.organizationRepo.countTotal({ status: 'pending_approval' }),
      this.organizationRepo.countTotal({ status: 'active' }),
      this.organizationRepo.countTotal({ status: 'rejected' }),
      this.organizationRepo.countTotal({ status: 'suspended' }),
    ]);

    return { pending, approved, rejected, suspended };
  }

  private async sendApprovalNotification(
    organization: Organization,
    approved: boolean,
    reason?: string,
  ): Promise<void> {
    try {
      // Get organization owner to send notification
      const orgWithUsers = await this.organizationRepo.findById(organization.id);
      const ownerUserId = orgWithUsers?.organizationUsers?.[0]?.userId;

      if (ownerUserId) {
        await this.notificationsService.send({
          userId: ownerUserId,
          event: approved ? 'organization.approved' : 'organization.rejected',
          channels: [NotificationChannel.EMAIL, NotificationChannel.REALTIME],
          title: approved
            ? `Your organization "${organization.name}" has been approved!`
            : `Your organization "${organization.name}" application was not approved`,
          message: approved
            ? 'Congratulations! Your organization is now active and you can start using the platform.'
            : `Reason: ${reason}`,
          data: {
            organizationId: organization.id,
            organizationName: organization.name,
            approved,
            reason,
          },
        });
      }
    } catch (error) {
      this.logger.error(`Failed to send approval notification: ${error.message}`);
    }
  }

  private async sendSuspensionNotification(
    organization: Organization,
    reason: string,
  ): Promise<void> {
    try {
      const orgWithUsers = await this.organizationRepo.findById(organization.id);
      const ownerUserId = orgWithUsers?.organizationUsers?.[0]?.userId;

      if (ownerUserId) {
        await this.notificationsService.send({
          userId: ownerUserId,
          event: 'organization.suspended',
          channels: [NotificationChannel.EMAIL, NotificationChannel.REALTIME],
          title: `Your organization "${organization.name}" has been suspended`,
          message: `Reason: ${reason}. Please contact support for more information.`,
          data: {
            organizationId: organization.id,
            organizationName: organization.name,
            reason,
          },
        });
      }
    } catch (error) {
      this.logger.error(`Failed to send suspension notification: ${error.message}`);
    }
  }

  private async sendReactivationNotification(organization: Organization): Promise<void> {
    try {
      const orgWithUsers = await this.organizationRepo.findById(organization.id);
      const ownerUserId = orgWithUsers?.organizationUsers?.[0]?.userId;

      if (ownerUserId) {
        await this.notificationsService.send({
          userId: ownerUserId,
          event: 'organization.reactivated',
          channels: [NotificationChannel.EMAIL, NotificationChannel.REALTIME],
          title: `Your organization "${organization.name}" has been reactivated!`,
          message: 'Your organization is now active again. Welcome back!',
          data: {
            organizationId: organization.id,
            organizationName: organization.name,
          },
        });
      }
    } catch (error) {
      this.logger.error(`Failed to send reactivation notification: ${error.message}`);
    }
  }
}


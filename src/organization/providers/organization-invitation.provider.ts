import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { OrganizationUser } from '@prisma/client';
import { OrganizationRepository } from '../repositories/organization.repository';
import { OrganizationUserRepository, OrganizationUserWithRelations } from '../repositories/organization-user.repository';
import { InviteUserDto, UpdateOrganizationUserDto, BulkInviteUsersDto } from '../dtos';
import { PaginatedResult } from 'src/shared/types';
import { NotificationsService } from 'src/notifications/notifications.service';
import { NotificationChannel } from 'src/notifications/enums';
import { PrismaService } from 'src/core/config/prisma/prisma.service';

@Injectable()
export class OrganizationInvitationProvider {
  private readonly logger = new Logger(OrganizationInvitationProvider.name);

  constructor(
    private readonly organizationRepo: OrganizationRepository,
    private readonly orgUserRepo: OrganizationUserRepository,
    private readonly notificationsService: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}

  async inviteUser(
    organizationId: number,
    dto: InviteUserDto,
    invitedBy: number,
  ): Promise<OrganizationUserWithRelations> {
    // Verify organization exists
    const organization = await this.organizationRepo.findByIdBasic(organizationId);
    if (!organization) {
      throw new NotFoundException(`Organization with ID ${organizationId} not found`);
    }

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new NotFoundException(`User with email "${dto.email}" not found`);
    }

    // Check if user is already a member
    const existingMembership = await this.orgUserRepo.findByUserAndOrg(user.id, organizationId);
    if (existingMembership) {
      if (existingMembership.isActive) {
        throw new ConflictException(`User is already a member of this organization`);
      }
      // Reactivate if previously deactivated
      return this.orgUserRepo.activate(existingMembership.id);
    }

    // Create organization user
    const orgUser = await this.orgUserRepo.create({
      user: { connect: { id: user.id } },
      organization: { connect: { id: organizationId } },
      role: { connect: { id: dto.roleId } },
      invitedBy,
      isActive: true,
      joinedAt: new Date(),
    });

    // Add custom permissions if provided
    if (dto.customPermissions?.length) {
      await this.orgUserRepo.updateCustomPermissions(orgUser.id, dto.customPermissions);
    }

    this.logger.log(`User ${user.id} invited to organization ${organizationId}`);

    // Send invitation notification
    await this.sendInvitationNotification(user.id, organization.name, invitedBy);

    const result = await this.orgUserRepo.findById(orgUser.id);
    if (!result) {
      throw new NotFoundException(`Failed to retrieve created organization user`);
    }
    return result;
  }

  async bulkInviteUsers(
    organizationId: number,
    dto: BulkInviteUsersDto,
    invitedBy: number,
  ): Promise<{ success: number; failed: { email: string; reason: string }[] }> {
    const results = {
      success: 0,
      failed: [] as { email: string; reason: string }[],
    };

    for (const invitation of dto.invitations) {
      try {
        await this.inviteUser(organizationId, invitation, invitedBy);
        results.success++;
      } catch (error) {
        results.failed.push({
          email: invitation.email,
          reason: error.message,
        });
      }
    }

    return results;
  }

  async getOrganizationMembers(
    organizationId: number,
    options?: { page?: number; limit?: number; isActive?: boolean; search?: string }
  ): Promise<PaginatedResult<OrganizationUserWithRelations>> {
    // Verify organization exists
    const organization = await this.organizationRepo.findByIdBasic(organizationId);
    if (!organization) {
      throw new NotFoundException(`Organization with ID ${organizationId} not found`);
    }

    return this.orgUserRepo.findByOrganization(organizationId, options);
  }

  async getMemberById(
    organizationId: number,
    memberId: number,
  ): Promise<OrganizationUserWithRelations> {
    const member = await this.orgUserRepo.findById(memberId);
    if (!member || member.organization.id !== organizationId) {
      throw new NotFoundException(`Member not found in this organization`);
    }
    return member;
  }

  async updateMember(
    organizationId: number,
    memberId: number,
    dto: UpdateOrganizationUserDto,
  ): Promise<OrganizationUserWithRelations> {
    const member = await this.orgUserRepo.findById(memberId);
    if (!member || member.organization.id !== organizationId) {
      throw new NotFoundException(`Member not found in this organization`);
    }

    // Update role if provided
    if (dto.roleId) {
      await this.orgUserRepo.update(memberId, {
        role: { connect: { id: dto.roleId } },
      });
    }

    // Update custom permissions if provided
    if (dto.customPermissions) {
      await this.orgUserRepo.updateCustomPermissions(memberId, dto.customPermissions);
    }

    const result = await this.orgUserRepo.findById(memberId);
    if (!result) {
      throw new NotFoundException(`Failed to retrieve updated member`);
    }
    return result;
  }

  async removeMember(
    organizationId: number,
    memberId: number,
    removedBy: number,
  ): Promise<void> {
    const member = await this.orgUserRepo.findById(memberId);
    if (!member || member.organization.id !== organizationId) {
      throw new NotFoundException(`Member not found in this organization`);
    }

    // Prevent removing yourself
    if (member.userId === removedBy) {
      throw new BadRequestException(`You cannot remove yourself from the organization`);
    }

    // Soft delete - deactivate instead of hard delete
    await this.orgUserRepo.deactivate(memberId);

    this.logger.log(`Member ${memberId} removed from organization ${organizationId}`);

    // Send notification
    await this.sendRemovalNotification(member.userId, member.organization.name);
  }

  async leaveOrganization(
    organizationId: number,
    userId: number,
  ): Promise<void> {
    const member = await this.orgUserRepo.findByUserAndOrg(userId, organizationId);
    if (!member) {
      throw new NotFoundException(`You are not a member of this organization`);
    }

    // Check if user is the only admin/owner
    const memberCount = await this.orgUserRepo.countMembers(organizationId);
    if (memberCount === 1) {
      throw new BadRequestException(
        `You are the only member. Please transfer ownership or delete the organization.`
      );
    }

    await this.orgUserRepo.deactivate(member.id);
    this.logger.log(`User ${userId} left organization ${organizationId}`);
  }

  async getUserOrganizations(userId: number): Promise<OrganizationUserWithRelations[]> {
    return this.orgUserRepo.findByUser(userId);
  }

  async getUserPermissionsInOrg(userId: number, organizationId: number): Promise<string[]> {
    return this.orgUserRepo.getUserPermissions(userId, organizationId);
  }

  async isMember(userId: number, organizationId: number): Promise<boolean> {
    return this.orgUserRepo.isMember(userId, organizationId);
  }

  async getUserRole(userId: number, organizationId: number): Promise<string | null> {
    return this.orgUserRepo.getUserRole(userId, organizationId);
  }

  private async sendInvitationNotification(
    userId: number,
    organizationName: string,
    invitedBy: number,
  ): Promise<void> {
    try {
      await this.notificationsService.send({
        userId,
        event: 'organization.invitation',
        channels: [NotificationChannel.EMAIL, NotificationChannel.REALTIME],
        title: `You've been invited to join "${organizationName}"`,
        message: `You have been added as a member of ${organizationName}.`,
        data: {
          organizationName,
          invitedBy,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to send invitation notification: ${error.message}`);
    }
  }

  private async sendRemovalNotification(
    userId: number,
    organizationName: string,
  ): Promise<void> {
    try {
      await this.notificationsService.send({
        userId,
        event: 'organization.removed',
        channels: [NotificationChannel.EMAIL, NotificationChannel.REALTIME],
        title: `You've been removed from "${organizationName}"`,
        message: `You are no longer a member of ${organizationName}.`,
        data: {
          organizationName,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to send removal notification: ${error.message}`);
    }
  }
}


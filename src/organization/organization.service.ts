import { Injectable } from '@nestjs/common';
import { Organization, OrganizationDocument, OrganizationStatus, DocumentType, DocumentStatus } from '@prisma/client';
import {
  OrganizationManagementProvider,
  OrganizationApprovalProvider,
  OrganizationInvitationProvider,
  OrganizationDocumentProvider,
  OrganizationSettingsProvider,
} from './providers';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  OrganizationFilterDto,
  InviteUserDto,
  BulkInviteUsersDto,
  UpdateOrganizationUserDto,
  ApproveOrganizationDto,
  RejectOrganizationDto,
  SuspendOrganizationDto,
  ReactivateOrganizationDto,
  UploadDocumentDto,
  ApproveDocumentDto,
  RejectDocumentDto,
  UpdateDocumentDto,
  UpdateOrganizationSettingsDto,
} from './dtos';
import { OrganizationWithRelations } from './repositories/organization.repository';
import { OrganizationUserWithRelations } from './repositories/organization-user.repository';
import { DocumentWithOrganization } from './repositories/organization-document.repository';
import { SettingsWithAttributes } from './repositories/organization-settings.repository';
import { PaginatedResult } from 'src/shared/types';

@Injectable()
export class OrganizationService {
  constructor(
    private readonly managementProvider: OrganizationManagementProvider,
    private readonly approvalProvider: OrganizationApprovalProvider,
    private readonly invitationProvider: OrganizationInvitationProvider,
    private readonly documentProvider: OrganizationDocumentProvider,
    private readonly settingsProvider: OrganizationSettingsProvider,
  ) {}

  // ========================
  // Organization CRUD
  // ========================

  async createOrganization(
    dto: CreateOrganizationDto,
    creatorUserId: number,
    creatorRoleId: number,
  ): Promise<OrganizationWithRelations> {
    return this.managementProvider.createOrganization(dto, creatorUserId, creatorRoleId);
  }

  async getOrganizationById(id: number): Promise<OrganizationWithRelations> {
    return this.managementProvider.getOrganizationById(id);
  }

  async getOrganizationBySlug(slug: string): Promise<OrganizationWithRelations> {
    return this.managementProvider.getOrganizationBySlug(slug);
  }

  async getOrganizations(filterDto: OrganizationFilterDto): Promise<PaginatedResult<Organization>> {
    return this.managementProvider.getOrganizations(filterDto);
  }

  async updateOrganization(id: number, dto: UpdateOrganizationDto): Promise<Organization> {
    return this.managementProvider.updateOrganization(id, dto);
  }

  async deleteOrganization(id: number): Promise<void> {
    return this.managementProvider.deleteOrganization(id);
  }

  async getOrganizationsByUser(userId: number): Promise<OrganizationWithRelations[]> {
    return this.managementProvider.getOrganizationsByUser(userId);
  }

  async getOrganizationsByType(
    type: string,
    options?: { page?: number; limit?: number }
  ): Promise<PaginatedResult<Organization>> {
    return this.managementProvider.getOrganizationsByType(type, options);
  }

  async searchOrganizations(query: string): Promise<Organization[]> {
    return this.managementProvider.searchOrganizations(query);
  }

  async checkSlugAvailability(slug: string, excludeId?: number): Promise<boolean> {
    return this.managementProvider.checkSlugAvailability(slug, excludeId);
  }

  async getOrganizationStats(id: number) {
    return this.managementProvider.getOrganizationStats(id);
  }

  // ========================
  // Approval Workflow
  // ========================

  async getPendingOrganizations(options?: { page?: number; limit?: number }) {
    return this.approvalProvider.getPendingOrganizations(options);
  }

  async approveOrganization(id: number, dto: ApproveOrganizationDto, approvedBy: number) {
    return this.approvalProvider.approveOrganization(id, dto, approvedBy);
  }

  async rejectOrganization(id: number, dto: RejectOrganizationDto, rejectedBy: number) {
    return this.approvalProvider.rejectOrganization(id, dto, rejectedBy);
  }

  async suspendOrganization(id: number, dto: SuspendOrganizationDto, suspendedBy: number) {
    return this.approvalProvider.suspendOrganization(id, dto, suspendedBy);
  }

  async reactivateOrganization(id: number, dto: ReactivateOrganizationDto, reactivatedBy: number) {
    return this.approvalProvider.reactivateOrganization(id, dto, reactivatedBy);
  }

  async getOrganizationsByStatus(status: OrganizationStatus, options?: { page?: number; limit?: number }) {
    return this.approvalProvider.getOrganizationsByStatus(status, options);
  }

  async getApprovalStats() {
    return this.approvalProvider.getApprovalStats();
  }

  // ========================
  // User Invitations & Members
  // ========================

  async inviteUser(organizationId: number, dto: InviteUserDto, invitedBy: number) {
    return this.invitationProvider.inviteUser(organizationId, dto, invitedBy);
  }

  async bulkInviteUsers(organizationId: number, dto: BulkInviteUsersDto, invitedBy: number) {
    return this.invitationProvider.bulkInviteUsers(organizationId, dto, invitedBy);
  }

  async getOrganizationMembers(
    organizationId: number,
    options?: { page?: number; limit?: number; isActive?: boolean; search?: string }
  ) {
    return this.invitationProvider.getOrganizationMembers(organizationId, options);
  }

  async getMemberById(organizationId: number, memberId: number) {
    return this.invitationProvider.getMemberById(organizationId, memberId);
  }

  async updateMember(organizationId: number, memberId: number, dto: UpdateOrganizationUserDto) {
    return this.invitationProvider.updateMember(organizationId, memberId, dto);
  }

  async removeMember(organizationId: number, memberId: number, removedBy: number) {
    return this.invitationProvider.removeMember(organizationId, memberId, removedBy);
  }

  async leaveOrganization(organizationId: number, userId: number) {
    return this.invitationProvider.leaveOrganization(organizationId, userId);
  }

  async getUserOrganizations(userId: number) {
    return this.invitationProvider.getUserOrganizations(userId);
  }

  async getUserPermissionsInOrg(userId: number, organizationId: number) {
    return this.invitationProvider.getUserPermissionsInOrg(userId, organizationId);
  }

  async isMember(userId: number, organizationId: number) {
    return this.invitationProvider.isMember(userId, organizationId);
  }

  // ========================
  // Documents
  // ========================

  async uploadDocument(organizationId: number, dto: UploadDocumentDto, file: Express.Multer.File) {
    return this.documentProvider.uploadDocument(organizationId, dto, file);
  }

  async getDocumentById(id: number) {
    return this.documentProvider.getDocumentById(id);
  }

  async getOrganizationDocuments(
    organizationId: number,
    options?: { status?: DocumentStatus; type?: DocumentType }
  ) {
    return this.documentProvider.getOrganizationDocuments(organizationId, options);
  }

  async getPendingDocuments(options?: { page?: number; limit?: number }) {
    return this.documentProvider.getPendingDocuments(options);
  }

  async approveDocument(id: number, dto: ApproveDocumentDto, reviewedBy: number) {
    return this.documentProvider.approveDocument(id, dto, reviewedBy);
  }

  async rejectDocument(id: number, dto: RejectDocumentDto, reviewedBy: number) {
    return this.documentProvider.rejectDocument(id, dto, reviewedBy);
  }

  async deleteDocument(id: number) {
    return this.documentProvider.deleteDocument(id);
  }

  async replaceDocument(id: number, file: Express.Multer.File) {
    return this.documentProvider.replaceDocument(id, file);
  }

  async getDocumentStats(organizationId: number) {
    return this.documentProvider.getDocumentStats(organizationId);
  }

  // ========================
  // Settings
  // ========================

  async getSettings(organizationId: number) {
    return this.settingsProvider.getSettings(organizationId);
  }

  async updateSettings(organizationId: number, dto: UpdateOrganizationSettingsDto) {
    return this.settingsProvider.updateSettings(organizationId, dto);
  }

  async getAdditionalSettings(organizationId: number) {
    return this.settingsProvider.getAdditionalSettings(organizationId);
  }

  async setAdditionalSetting(organizationId: number, key: string, value: any) {
    return this.settingsProvider.setAdditionalSetting(organizationId, key, value);
  }

  async deleteAdditionalSetting(organizationId: number, key: string) {
    return this.settingsProvider.deleteAdditionalSetting(organizationId, key);
  }
}


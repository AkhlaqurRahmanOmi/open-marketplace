import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { OrganizationDocument, DocumentType, DocumentStatus } from '@prisma/client';
import { OrganizationRepository } from '../repositories';
import { OrganizationDocumentRepository, DocumentWithOrganization } from '../repositories';
import {
  UploadDocumentDto,
  ApproveDocumentDto,
  RejectDocumentDto,
  UpdateDocumentDto,
} from '../dtos';
import { PaginatedResult } from 'src/shared/types';
import { S3UploadService, UploadResult } from 'src/shared/services/s3-upload.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import { NotificationChannel } from 'src/notifications/enums';

@Injectable()
export class OrganizationDocumentProvider {
  private readonly logger = new Logger(OrganizationDocumentProvider.name);

  constructor(
    private readonly organizationRepo: OrganizationRepository,
    private readonly documentRepo: OrganizationDocumentRepository,
    private readonly s3UploadService: S3UploadService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async uploadDocument(
    organizationId: number,
    dto: UploadDocumentDto,
    file: Express.Multer.File,
  ): Promise<OrganizationDocument> {
    // Verify organization exists
    const organization = await this.organizationRepo.findByIdBasic(organizationId);
    if (!organization) {
      throw new NotFoundException(`Organization with ID ${organizationId} not found`);
    }

    // Validate file type
    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: PDF, JPEG, PNG, WebP`
      );
    }

    // Upload to S3
    const uploadResult = await this.s3UploadService.uploadFile(
      file,
      `organizations/${organizationId}/documents`
    );

    // Create document record
    const document = await this.documentRepo.create({
      organization: { connect: { id: organizationId } },
      type: dto.type,
      status: 'pending',
      fileUrl: uploadResult.fileUrl,
      fileName: uploadResult.fileName,
      fileSize: uploadResult.fileSize,
      mimeType: uploadResult.mimeType,
      ...(dto.expiresAt && { expiresAt: new Date(dto.expiresAt) }),
    });

    this.logger.log(`Document uploaded for organization ${organizationId}: ${document.id}`);

    return document;
  }

  async getDocumentById(id: number): Promise<DocumentWithOrganization> {
    const document = await this.documentRepo.findById(id);
    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }
    return document;
  }

  async getOrganizationDocuments(
    organizationId: number,
    options?: { status?: DocumentStatus; type?: DocumentType }
  ): Promise<OrganizationDocument[]> {
    // Verify organization exists
    const organization = await this.organizationRepo.findByIdBasic(organizationId);
    if (!organization) {
      throw new NotFoundException(`Organization with ID ${organizationId} not found`);
    }

    return this.documentRepo.findByOrganization(organizationId, options);
  }

  async getPendingDocuments(
    options?: { page?: number; limit?: number }
  ): Promise<PaginatedResult<DocumentWithOrganization>> {
    return this.documentRepo.findPendingDocuments(options);
  }

  async getExpiringDocuments(daysAhead: number = 30): Promise<DocumentWithOrganization[]> {
    return this.documentRepo.findExpiringDocuments(daysAhead);
  }

  async approveDocument(
    id: number,
    dto: ApproveDocumentDto,
    reviewedBy: number,
  ): Promise<OrganizationDocument> {
    const document = await this.documentRepo.findById(id);
    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    if (document.status !== 'pending') {
      throw new BadRequestException(
        `Document is not pending review. Current status: ${document.status}`
      );
    }

    const updated = await this.documentRepo.approve(id, reviewedBy);

    this.logger.log(`Document approved: ${id} by user ${reviewedBy}`);

    // Send notification
    await this.sendDocumentStatusNotification(document, 'approved');

    return updated;
  }

  async rejectDocument(
    id: number,
    dto: RejectDocumentDto,
    reviewedBy: number,
  ): Promise<OrganizationDocument> {
    const document = await this.documentRepo.findById(id);
    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    if (document.status !== 'pending') {
      throw new BadRequestException(
        `Document is not pending review. Current status: ${document.status}`
      );
    }

    const updated = await this.documentRepo.reject(id, reviewedBy, dto.reason);

    this.logger.log(`Document rejected: ${id} - Reason: ${dto.reason}`);

    // Send notification
    await this.sendDocumentStatusNotification(document, 'rejected', dto.reason);

    return updated;
  }

  async updateDocument(
    id: number,
    dto: UpdateDocumentDto,
  ): Promise<OrganizationDocument> {
    const document = await this.documentRepo.findById(id);
    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    return this.documentRepo.update(id, {
      ...(dto.type && { type: dto.type }),
      ...(dto.expiresAt && { expiresAt: new Date(dto.expiresAt) }),
    });
  }

  async deleteDocument(id: number): Promise<void> {
    const document = await this.documentRepo.findById(id);
    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    // Delete from S3
    try {
      await this.s3UploadService.deleteFile(document.fileUrl);
    } catch (error) {
      this.logger.error(`Failed to delete file from S3: ${error.message}`);
    }

    // Delete record
    await this.documentRepo.delete(id);

    this.logger.log(`Document deleted: ${id}`);
  }

  async replaceDocument(
    id: number,
    file: Express.Multer.File,
  ): Promise<OrganizationDocument> {
    const document = await this.documentRepo.findById(id);
    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    // Delete old file from S3
    try {
      await this.s3UploadService.deleteFile(document.fileUrl);
    } catch (error) {
      this.logger.error(`Failed to delete old file from S3: ${error.message}`);
    }

    // Upload new file
    const uploadResult = await this.s3UploadService.uploadFile(
      file,
      `organizations/${document.organizationId}/documents`
    );

    // Update document record - reset to pending
    return this.documentRepo.update(id, {
      fileUrl: uploadResult.fileUrl,
      fileName: uploadResult.fileName,
      fileSize: uploadResult.fileSize,
      mimeType: uploadResult.mimeType,
      status: 'pending',
      reviewedAt: null,
      reviewedBy: null,
      rejectionReason: null,
    });
  }

  async checkRequiredDocuments(
    organizationId: number,
    requiredTypes: DocumentType[]
  ): Promise<{ complete: boolean; missing: DocumentType[] }> {
    return this.documentRepo.hasRequiredDocuments(organizationId, requiredTypes);
  }

  async getDocumentStats(organizationId: number): Promise<Record<DocumentStatus, number>> {
    return this.documentRepo.countByStatus(organizationId);
  }

  private async sendDocumentStatusNotification(
    document: DocumentWithOrganization,
    status: 'approved' | 'rejected',
    reason?: string,
  ): Promise<void> {
    try {
      // Get organization owner
      const org = await this.organizationRepo.findById(document.organizationId);
      const ownerUserId = org?.organizationUsers?.[0]?.userId;

      if (ownerUserId) {
        await this.notificationsService.send({
          userId: ownerUserId,
          event: `document.${status}`,
          channels: [NotificationChannel.EMAIL, NotificationChannel.REALTIME],
          title: status === 'approved'
            ? `Your document has been approved`
            : `Your document was not approved`,
          message: status === 'approved'
            ? `Your ${document.type} document has been verified.`
            : `Reason: ${reason}. Please upload a new document.`,
          data: {
            documentId: document.id,
            documentType: document.type,
            organizationId: document.organizationId,
            status,
            reason,
          },
        });
      }
    } catch (error) {
      this.logger.error(`Failed to send document notification: ${error.message}`);
    }
  }
}


import { Injectable } from '@nestjs/common';
import { OrganizationDocument, Prisma, DocumentStatus, DocumentType } from '@prisma/client';
import { PrismaService } from 'src/core/config/prisma/prisma.service';
import { PaginatedResult } from 'src/shared/types';

// Type for document with organization info
export type DocumentWithOrganization = OrganizationDocument & {
  organization: {
    id: number;
    name: string;
    slug: string;
    type: string;
  };
};

@Injectable()
export class OrganizationDocumentRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly includeOrganization = {
    organization: {
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
      },
    },
  };

  async findById(id: number): Promise<DocumentWithOrganization | null> {
    return this.prisma.organizationDocument.findUnique({
      where: { id },
      include: this.includeOrganization,
    });
  }

  async findByOrganization(
    organizationId: number,
    options?: { status?: DocumentStatus; type?: DocumentType }
  ): Promise<OrganizationDocument[]> {
    return this.prisma.organizationDocument.findMany({
      where: {
        organizationId,
        ...(options?.status && { status: options.status }),
        ...(options?.type && { type: options.type }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPendingDocuments(
    options?: { page?: number; limit?: number }
  ): Promise<PaginatedResult<DocumentWithOrganization>> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.OrganizationDocumentWhereInput = { status: 'pending' };

    const [data, totalItems] = await Promise.all([
      this.prisma.organizationDocument.findMany({
        where,
        include: this.includeOrganization,
        orderBy: { uploadedAt: 'asc' }, // Oldest first
        skip,
        take: limit,
      }),
      this.prisma.organizationDocument.count({ where }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: data as DocumentWithOrganization[],
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async findExpiringDocuments(daysAhead: number = 30): Promise<DocumentWithOrganization[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return this.prisma.organizationDocument.findMany({
      where: {
        status: 'approved',
        expiresAt: {
          lte: futureDate,
          gte: new Date(),
        },
      },
      include: this.includeOrganization,
      orderBy: { expiresAt: 'asc' },
    }) as Promise<DocumentWithOrganization[]>;
  }

  async create(data: Prisma.OrganizationDocumentCreateInput): Promise<OrganizationDocument> {
    return this.prisma.organizationDocument.create({
      data,
    });
  }

  async update(id: number, data: Prisma.OrganizationDocumentUpdateInput): Promise<OrganizationDocument> {
    return this.prisma.organizationDocument.update({
      where: { id },
      data,
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.organizationDocument.delete({
      where: { id },
    });
  }

  async approve(id: number, reviewedBy: number): Promise<OrganizationDocument> {
    return this.prisma.organizationDocument.update({
      where: { id },
      data: {
        status: 'approved',
        reviewedAt: new Date(),
        reviewedBy,
        rejectionReason: null,
      },
    });
  }

  async reject(id: number, reviewedBy: number, reason: string): Promise<OrganizationDocument> {
    return this.prisma.organizationDocument.update({
      where: { id },
      data: {
        status: 'rejected',
        reviewedAt: new Date(),
        reviewedBy,
        rejectionReason: reason,
      },
    });
  }

  // Check if organization has all required documents approved
  async hasRequiredDocuments(
    organizationId: number,
    requiredTypes: DocumentType[]
  ): Promise<{ complete: boolean; missing: DocumentType[] }> {
    const approvedDocs = await this.prisma.organizationDocument.findMany({
      where: {
        organizationId,
        status: 'approved',
        type: { in: requiredTypes },
      },
      select: { type: true },
    });

    const approvedTypes = new Set(approvedDocs.map((d) => d.type));
    const missing = requiredTypes.filter((t) => !approvedTypes.has(t));

    return {
      complete: missing.length === 0,
      missing,
    };
  }

  // Count documents by status for an organization
  async countByStatus(organizationId: number): Promise<Record<DocumentStatus, number>> {
    const counts = await this.prisma.organizationDocument.groupBy({
      by: ['status'],
      where: { organizationId },
      _count: { status: true },
    });

    const result: Record<DocumentStatus, number> = {
      pending: 0,
      approved: 0,
      rejected: 0,
    };

    counts.forEach((c) => {
      result[c.status] = c._count.status;
    });

    return result;
  }

  // Delete all documents for an organization
  async deleteByOrganization(organizationId: number): Promise<number> {
    const result = await this.prisma.organizationDocument.deleteMany({
      where: { organizationId },
    });
    return result.count;
  }
}


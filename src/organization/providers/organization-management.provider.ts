import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Organization } from '@prisma/client';
import { OrganizationRepository, OrganizationWithRelations } from '../repositories';
import { OrganizationSettingsRepository } from '../repositories';
import { OrganizationUserRepository } from '../repositories';
import { CreateOrganizationDto, UpdateOrganizationDto, OrganizationFilterDto } from '../dtos';
import { PaginatedResult } from 'src/shared/types';
import { UnitOfWorkService } from 'src/shared/services/unit-of-work.service';
import { AttributesService } from 'src/attributes/attributes.service';

@Injectable()
export class OrganizationManagementProvider {
  private readonly logger = new Logger(OrganizationManagementProvider.name);

  constructor(
    private readonly organizationRepo: OrganizationRepository,
    private readonly settingsRepo: OrganizationSettingsRepository,
    private readonly orgUserRepo: OrganizationUserRepository,
    private readonly unitOfWork: UnitOfWorkService,
    private readonly attributesService: AttributesService,
  ) {}

  async createOrganization(
    dto: CreateOrganizationDto,
    creatorUserId: number,
    creatorRoleId: number,
  ): Promise<OrganizationWithRelations> {
    // Check for duplicate slug
    if (await this.organizationRepo.slugExists(dto.slug)) {
      throw new ConflictException(`Organization with slug "${dto.slug}" already exists`);
    }

    // Check for duplicate email
    if (await this.organizationRepo.emailExists(dto.email)) {
      throw new ConflictException(`Organization with email "${dto.email}" already exists`);
    }

    // Use transaction to create org, settings, and add creator as owner
    return this.unitOfWork.transaction(async (prisma) => {
      // Create organization
      const organization = await prisma.organization.create({
        data: {
          type: dto.type,
          name: dto.name,
          slug: dto.slug,
          email: dto.email,
          phone: dto.phone,
          description: dto.description,
          registrationNumber: dto.registrationNumber,
          taxId: dto.taxId,
          addressLine1: dto.addressLine1,
          addressLine2: dto.addressLine2,
          city: dto.city,
          state: dto.state,
          postalCode: dto.postalCode,
          country: dto.country,
          status: 'pending_approval',
        },
      });

      // Create default settings
      await prisma.organizationSettings.create({
        data: {
          organizationId: organization.id,
          notificationEmail: dto.email,
          language: 'en',
        },
      });

      // Add creator as organization owner/admin
      await prisma.organizationUser.create({
        data: {
          userId: creatorUserId,
          organizationId: organization.id,
          roleId: creatorRoleId,
          isActive: true,
          joinedAt: new Date(),
        },
      });

      // Handle dynamic attributes
      if (dto.attributes) {
        await this.attributesService.setAttributes(organization.id, dto.attributes);
      }

      this.logger.log(`Organization created: ${organization.id} - ${organization.name}`);

      // Fetch with relations
      const result = await this.organizationRepo.findById(organization.id);
      if (!result) {
        throw new NotFoundException(`Failed to retrieve created organization`);
      }
      return result;
    });
  }

  async getOrganizationById(id: number): Promise<OrganizationWithRelations> {
    const organization = await this.organizationRepo.findById(id);
    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }
    return organization;
  }

  async getOrganizationBySlug(slug: string): Promise<OrganizationWithRelations> {
    const organization = await this.organizationRepo.findBySlug(slug);
    if (!organization) {
      throw new NotFoundException(`Organization with slug "${slug}" not found`);
    }
    return organization;
  }

  async getOrganizations(filterDto: OrganizationFilterDto): Promise<PaginatedResult<Organization>> {
    return this.organizationRepo.findWithFilters({
      filters: {
        type: filterDto.type,
        status: filterDto.status,
        city: filterDto.city,
        state: filterDto.state,
        country: filterDto.country,
        isActive: filterDto.isActive,
        search: filterDto.search,
      },
      sort: {
        field: filterDto.sortBy || 'createdAt',
        order: filterDto.sortOrder || 'desc',
      },
      pagination: {
        page: filterDto.page || 1,
        limit: filterDto.limit || 20,
      },
    });
  }

  async updateOrganization(id: number, dto: UpdateOrganizationDto): Promise<Organization> {
    const organization = await this.organizationRepo.findByIdBasic(id);
    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    // Check email uniqueness if being updated
    if (dto.email && dto.email !== organization.email) {
      if (await this.organizationRepo.emailExists(dto.email, id)) {
        throw new ConflictException(`Email "${dto.email}" is already in use`);
      }
    }

    // Handle dynamic attributes
    if (dto.attributes) {
      await this.attributesService.setAttributes(id, dto.attributes);
    }

    return this.organizationRepo.update(id, dto);
  }

  async deleteOrganization(id: number): Promise<void> {
    const organization = await this.organizationRepo.findByIdBasic(id);
    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    // Soft delete by setting isActive to false and status to closed
    await this.organizationRepo.update(id, {
      isActive: false,
      status: 'closed',
    });

    this.logger.log(`Organization soft deleted: ${id}`);
  }

  async hardDeleteOrganization(id: number): Promise<void> {
    const organization = await this.organizationRepo.findByIdBasic(id);
    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    await this.organizationRepo.delete(id);
    this.logger.log(`Organization hard deleted: ${id}`);
  }

  async getOrganizationsByUser(userId: number): Promise<OrganizationWithRelations[]> {
    return this.organizationRepo.findByUserId(userId);
  }

  async getOrganizationsByType(
    type: string,
    options?: { page?: number; limit?: number }
  ): Promise<PaginatedResult<Organization>> {
    return this.organizationRepo.findByType(type, options);
  }

  async searchOrganizations(query: string): Promise<Organization[]> {
    return this.organizationRepo.search(query);
  }

  async checkSlugAvailability(slug: string, excludeId?: number): Promise<boolean> {
    return !(await this.organizationRepo.slugExists(slug, excludeId));
  }

  async checkEmailAvailability(email: string, excludeId?: number): Promise<boolean> {
    return !(await this.organizationRepo.emailExists(email, excludeId));
  }

  // Get organization statistics
  async getOrganizationStats(id: number): Promise<{
    memberCount: number;
    productCount: number;
    documentCount: number;
    pendingDocuments: number;
  }> {
    const org = await this.organizationRepo.findById(id);
    if (!org) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    return {
      memberCount: org._count?.organizationUsers || 0,
      productCount: org._count?.products || 0,
      documentCount: org._count?.documents || 0,
      pendingDocuments: org.documents?.filter((d) => d.status === 'pending').length || 0,
    };
  }
}


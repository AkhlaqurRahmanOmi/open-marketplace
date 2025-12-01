import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OrganizationService } from './organization.service';
import {
  OrganizationFilterDto,
  ApproveOrganizationDto,
  RejectOrganizationDto,
  SuspendOrganizationDto,
  ReactivateOrganizationDto,
  ApproveDocumentDto,
  RejectDocumentDto,
} from './dtos';
import { Auth } from 'src/auth/decorator/auth.decorator';
import { AuthType } from 'src/auth/enums/auth-type.enum';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { Permissions } from 'src/auth/decorator/permissions.decorator';
import { ActiveUser } from 'src/auth/decorator/active-user.decorator';
import type { ActiveUserData } from 'src/auth/interfaces/active-user-data.interface';
import type { OrganizationStatus } from '@prisma/client';

@Controller('admin/organizations')
@Auth(AuthType.Bearer)
export class OrganizationAdminController {
  constructor(private readonly organizationService: OrganizationService) {}

  // ========================
  // Organization Management
  // ========================

  @Get()
  // @Permissions('organizations:read')
  async getAllOrganizations(@Query() filterDto: OrganizationFilterDto) {
    return this.organizationService.getOrganizations(filterDto);
  }

  @Get('stats')
  @Permissions('organization:read')
  async getApprovalStats() {
    return this.organizationService.getApprovalStats();
  }

  @Get('pending')
  @Permissions('organizations:approve')
  async getPendingOrganizations(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.organizationService.getPendingOrganizations({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('status/:status')
  @Permissions('organizations:view')
  async getOrganizationsByStatus(
    @Param('status') status: OrganizationStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.organizationService.getOrganizationsByStatus(status, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get(':id')
  @Permissions('organizations:view')
  async getOrganizationById(@Param('id', ParseIntPipe) id: number) {
    return this.organizationService.getOrganizationById(id);
  }

  // ========================
  // Approval Workflow
  // ========================

  @Post(':id/approve')
  @Permissions('organizations:approve')
  @HttpCode(HttpStatus.OK)
  async approveOrganization(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApproveOrganizationDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.organizationService.approveOrganization(id, dto, user.sub);
  }

  @Post(':id/reject')
  @Permissions('organizations:approve')
  @HttpCode(HttpStatus.OK)
  async rejectOrganization(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectOrganizationDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.organizationService.rejectOrganization(id, dto, user.sub);
  }

  @Post(':id/suspend')
  @Permissions('organizations:suspend')
  @HttpCode(HttpStatus.OK)
  async suspendOrganization(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SuspendOrganizationDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.organizationService.suspendOrganization(id, dto, user.sub);
  }

  @Post(':id/reactivate')
  @Permissions('organizations:suspend')
  @HttpCode(HttpStatus.OK)
  async reactivateOrganization(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReactivateOrganizationDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.organizationService.reactivateOrganization(id, dto, user.sub);
  }

  @Delete(':id')
  @Permissions('organizations:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteOrganization(@Param('id', ParseIntPipe) id: number) {
    await this.organizationService.deleteOrganization(id);
  }

  // ========================
  // Document Review
  // ========================

  @Get('documents/pending')
  @Permissions('documents:review')
  async getPendingDocuments(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.organizationService.getPendingDocuments({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('documents/:id')
  @Permissions('documents:view')
  async getDocumentById(@Param('id', ParseIntPipe) id: number) {
    return this.organizationService.getDocumentById(id);
  }

  @Post('documents/:id/approve')
  @Permissions('documents:review')
  @HttpCode(HttpStatus.OK)
  async approveDocument(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApproveDocumentDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.organizationService.approveDocument(id, dto, user.sub);
  }

  @Post('documents/:id/reject')
  @Permissions('documents:review')
  @HttpCode(HttpStatus.OK)
  async rejectDocument(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectDocumentDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.organizationService.rejectDocument(id, dto, user.sub);
  }

  // ========================
  // Member Management (Admin Override)
  // ========================

  @Get(':id/members')
  @Permissions('organizations:view')
  async getOrganizationMembers(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ) {
    return this.organizationService.getOrganizationMembers(id, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      search,
    });
  }

  @Delete(':id/members/:memberId')
  @Permissions('organizations:update')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('memberId', ParseIntPipe) memberId: number,
    @ActiveUser() user: ActiveUserData,
  ) {
    await this.organizationService.removeMember(id, memberId, user.sub);
  }
}


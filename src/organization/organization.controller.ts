import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OrganizationService } from './organization.service';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  OrganizationFilterDto,
  InviteUserDto,
  BulkInviteUsersDto,
  UpdateOrganizationUserDto,
  UploadDocumentDto,
  UpdateOrganizationSettingsDto,
} from './dtos';
import { Auth } from 'src/auth/decorator/auth.decorator';
import { AuthType } from 'src/auth/enums/auth-type.enum';
import { Permissions } from 'src/auth/decorator/permissions.decorator';
import { ActiveUser } from 'src/auth/decorator/active-user.decorator';
import type { ActiveUserData } from 'src/auth/interfaces/active-user-data.interface';

@Controller('organizations')
@Auth(AuthType.Bearer)
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  // ========================
  // Organization CRUD
  // ========================

  @Post()
  @Permissions('organizations:create')
  @HttpCode(HttpStatus.CREATED)
  async createOrganization(
    @Body() dto: CreateOrganizationDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    // Default role ID for organization owner - should be fetched from config/db
    const ownerRoleId = 1; // Assuming role ID 2 is org owner/admin
    return this.organizationService.createOrganization(dto, user.sub, ownerRoleId);
  }

  @Get()
  @Permissions('organization:read')
  async getOrganizations(@Query() filterDto: OrganizationFilterDto) {
    return this.organizationService.getOrganizations(filterDto);
  }

  @Get('my-organizations')
  async getMyOrganizations(@ActiveUser() user: ActiveUserData) {
    return this.organizationService.getUserOrganizations(user.sub);
  }

  @Get('check-slug/:slug')
  async checkSlugAvailability(
    @Param('slug') slug: string,
    @Query('excludeId') excludeId?: string,
  ) {
    const available = await this.organizationService.checkSlugAvailability(
      slug,
      excludeId ? parseInt(excludeId, 10) : undefined,
    );
    return { available };
  }

  @Get('search')
  @Permissions('organization:read')
  async searchOrganizations(@Query('q') query: string) {
    return this.organizationService.searchOrganizations(query || '');
  }

  @Get('type/:type')
  @Permissions('organization:read')
  async getOrganizationsByType(
    @Param('type') type: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.organizationService.getOrganizationsByType(type, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get(':id')
  @Permissions('organization:read')
  async getOrganizationById(@Param('id', ParseIntPipe) id: number) {
    return this.organizationService.getOrganizationById(id);
  }

  @Get('slug/:slug')
  @Permissions('organization:read')
  async getOrganizationBySlug(@Param('slug') slug: string) {
    return this.organizationService.getOrganizationBySlug(slug);
  }

  @Get(':id/stats')
  @Permissions('organization:read')
  async getOrganizationStats(@Param('id', ParseIntPipe) id: number) {
    return this.organizationService.getOrganizationStats(id);
  }

  @Put(':id')
  @Permissions('organization:update')
  async updateOrganization(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.organizationService.updateOrganization(id, dto);
  }

  @Delete(':id')
  @Permissions('organization:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteOrganization(@Param('id', ParseIntPipe) id: number) {
    await this.organizationService.deleteOrganization(id);
  }

  // ========================
  // Members Management
  // ========================

  @Get(':id/members')
  @Permissions('organization:read')
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

  @Post(':id/members/invite')
  @Permissions('organization:invite')
  @HttpCode(HttpStatus.CREATED)
  async inviteUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: InviteUserDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.organizationService.inviteUser(id, dto, user.sub);
  }

  @Post(':id/members/bulk-invite')
  @Permissions('organization:invite')
  @HttpCode(HttpStatus.CREATED)
  async bulkInviteUsers(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: BulkInviteUsersDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.organizationService.bulkInviteUsers(id, dto, user.sub);
  }

  @Get(':id/members/:memberId')
  @Permissions('organization:read')
  async getMemberById(
    @Param('id', ParseIntPipe) id: number,
    @Param('memberId', ParseIntPipe) memberId: number,
  ) {
    return this.organizationService.getMemberById(id, memberId);
  }

  @Put(':id/members/:memberId')
  @Permissions('organization:update')
  async updateMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('memberId', ParseIntPipe) memberId: number,
    @Body() dto: UpdateOrganizationUserDto,
  ) {
    return this.organizationService.updateMember(id, memberId, dto);
  }

  @Delete(':id/members/:memberId')
  @Permissions('organization:update')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('memberId', ParseIntPipe) memberId: number,
    @ActiveUser() user: ActiveUserData,
  ) {
    await this.organizationService.removeMember(id, memberId, user.sub);
  }

  @Post(':id/leave')
  @HttpCode(HttpStatus.NO_CONTENT)
  async leaveOrganization(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() user: ActiveUserData,
  ) {
    await this.organizationService.leaveOrganization(id, user.sub);
  }

  @Get(':id/my-permissions')
  async getMyPermissions(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() user: ActiveUserData,
  ) {
    const permissions = await this.organizationService.getUserPermissionsInOrg(user.sub, id);
    return { permissions };
  }

  // ========================
  // Documents
  // ========================

  @Get(':id/documents')
  @Permissions('organization:read')
  async getOrganizationDocuments(
    @Param('id', ParseIntPipe) id: number,
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    return this.organizationService.getOrganizationDocuments(id, {
      status: status as any,
      type: type as any,
    });
  }

  @Post(':id/documents')
  @Permissions('organization:update')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  async uploadDocument(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UploadDocumentDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.organizationService.uploadDocument(id, dto, file);
  }

  @Get(':id/documents/stats')
  @Permissions('organization:read')
  async getDocumentStats(@Param('id', ParseIntPipe) id: number) {
    return this.organizationService.getDocumentStats(id);
  }

  @Delete('documents/:documentId')
  @Permissions('organization:update')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteDocument(@Param('documentId', ParseIntPipe) documentId: number) {
    await this.organizationService.deleteDocument(documentId);
  }

  @Put('documents/:documentId/replace')
  @Permissions('organization:update')
  @UseInterceptors(FileInterceptor('file'))
  async replaceDocument(
    @Param('documentId', ParseIntPipe) documentId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.organizationService.replaceDocument(documentId, file);
  }

  // ========================
  // Settings
  // ========================

  @Get(':id/settings')
  @Permissions('organization:read')
  async getSettings(@Param('id', ParseIntPipe) id: number) {
    return this.organizationService.getSettings(id);
  }

  @Put(':id/settings')
  @Permissions('organization:update')
  async updateSettings(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrganizationSettingsDto,
  ) {
    return this.organizationService.updateSettings(id, dto);
  }
}


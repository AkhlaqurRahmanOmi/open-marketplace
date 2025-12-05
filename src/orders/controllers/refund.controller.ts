import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { Permissions } from '../../auth/decorator/permissions.decorator';
import { RefundManagementProvider } from '../providers/refund-management.provider';
import {
  CreateRefundDto,
  RefundFilterDto,
  ApproveRefundDto,
  RejectRefundDto,
} from '../dtos';

@Controller('refunds')
export class RefundController {
  constructor(
    private readonly refundManagementProvider: RefundManagementProvider,
  ) {}

  /**
   * CUSTOMER ENDPOINTS
   * Accessible to order owners
   */

  /**
   * Create refund request for an order
   * POST /api/refunds
   */
  @Post()
  @Permissions('refunds:create')
  @HttpCode(HttpStatus.CREATED)
  async createRefund(@Body() dto: CreateRefundDto, @Request() req: any) {
    const userId = req.user.id;
    return this.refundManagementProvider.createRefund(dto, userId);
  }

  /**
   * Get refunds for a specific order
   * GET /api/refunds/order/:orderId
   */
  @Get('order/:orderId')
  @Permissions('refunds:view')
  async getOrderRefunds(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.refundManagementProvider.getOrderRefunds(orderId);
  }

  /**
   * Get refund details by ID
   * GET /api/refunds/:id
   */
  @Get(':id')
  @Permissions('refunds:view')
  async getRefundById(@Param('id', ParseIntPipe) id: number) {
    return this.refundManagementProvider.getRefundById(id);
  }

  /**
   * Cancel refund request (customer only, before approval)
   * DELETE /api/refunds/:id
   */
  @Delete(':id')
  @Permissions('refunds:cancel')
  @HttpCode(HttpStatus.OK)
  async cancelRefund(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    const userId = req.user.id;
    return this.refundManagementProvider.cancelRefund(id, userId);
  }

  /**
   * VENDOR ENDPOINTS
   * Accessible to organization members
   */

  /**
   * Get refunds for vendor's organization
   * GET /api/refunds/vendor/:organizationId
   */
  @Get('vendor/:organizationId')
  @Permissions('refunds:view')
  async getOrganizationRefunds(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query() filterDto: RefundFilterDto,
  ) {
    return this.refundManagementProvider.getOrganizationRefunds(
      organizationId,
      filterDto,
    );
  }

  /**
   * Get refund details for vendor (organization-scoped)
   * GET /api/refunds/vendor/:organizationId/:refundId
   */
  @Get('vendor/:organizationId/:refundId')
  @Permissions('refunds:view')
  async getVendorRefundById(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('refundId', ParseIntPipe) refundId: number,
  ) {
    return this.refundManagementProvider.getRefundById(
      refundId,
      organizationId,
    );
  }

  /**
   * Get refund statistics for vendor
   * GET /api/refunds/vendor/:organizationId/stats
   */
  @Get('vendor/:organizationId/stats')
  @Permissions('refunds:view')
  async getVendorRefundStats(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ) {
    return this.refundManagementProvider.getRefundStats(organizationId);
  }

  /**
   * PLATFORM ADMIN ENDPOINTS
   * Accessible to platform administrators
   */

  /**
   * Get all refunds with filters (admin)
   * GET /api/refunds/admin/all
   */
  @Get('admin/all')
  @Permissions('admin:refunds:view')
  async getAllRefunds(@Query() filterDto: RefundFilterDto) {
    return this.refundManagementProvider.getAllRefunds(filterDto);
  }

  /**
   * Get overall refund statistics (admin)
   * GET /api/refunds/admin/stats
   */
  @Get('admin/stats')
  @Permissions('admin:refunds:view')
  async getRefundStats() {
    return this.refundManagementProvider.getRefundStats();
  }

  /**
   * Approve refund request (admin)
   * PATCH /api/refunds/admin/:id/approve
   */
  @Patch('admin/:id/approve')
  @Permissions('admin:refunds:approve')
  @HttpCode(HttpStatus.OK)
  async approveRefund(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApproveRefundDto,
    @Request() req: any,
  ) {
    const approvedBy = req.user.id;
    return this.refundManagementProvider.approveRefund(
      id,
      approvedBy,
      dto.approverNotes,
    );
  }

  /**
   * Reject refund request (admin)
   * PATCH /api/refunds/admin/:id/reject
   */
  @Patch('admin/:id/reject')
  @Permissions('admin:refunds:reject')
  @HttpCode(HttpStatus.OK)
  async rejectRefund(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectRefundDto,
    @Request() req: any,
  ) {
    const rejectedBy = req.user.id;
    return this.refundManagementProvider.rejectRefund(
      id,
      dto.reason,
      rejectedBy,
    );
  }

  /**
   * Mark refund as completed (admin - after payment processing)
   * PATCH /api/refunds/admin/:id/complete
   */
  @Patch('admin/:id/complete')
  @Permissions('admin:refunds:complete')
  @HttpCode(HttpStatus.OK)
  async completeRefund(@Param('id', ParseIntPipe) id: number) {
    return this.refundManagementProvider.completeRefund(id);
  }
}

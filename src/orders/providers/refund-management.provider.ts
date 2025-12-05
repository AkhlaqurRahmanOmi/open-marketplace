import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Refund, RefundStatus } from '@prisma/client';
import { RefundRepository } from '../repositories/refund.repository';
import { CreateRefundDto, UpdateRefundDto, RefundFilterDto } from '../dtos';
import { PrismaService } from '../../core/config/prisma/prisma.service';
import { UnitOfWorkService } from '../../shared/services/unit-of-work.service';
import { VendorBalanceManagementProvider } from '../../vendors/providers/vendor-balance-management.provider';

@Injectable()
export class RefundManagementProvider {
  private readonly logger = new Logger(RefundManagementProvider.name);

  constructor(
    private readonly refundRepository: RefundRepository,
    private readonly prisma: PrismaService,
    private readonly unitOfWork: UnitOfWorkService,
    private readonly vendorBalanceProvider: VendorBalanceManagementProvider,
  ) {}

  /**
   * Create refund request (Phase 9: Multi-vendor refund management)
   * Splits refund by vendor, calculates proportional amounts, deducts balances
   */
  async createRefund(
    dto: CreateRefundDto,
    userId: number,
  ): Promise<Refund[]> {
    // 1. Validate order exists and belongs to user
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: {
        orderItems: {
          include: {
            variant: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${dto.orderId} not found`);
    }

    if (order.userId !== userId) {
      throw new BadRequestException('You can only refund your own orders');
    }

    // 2. Validate order status (only delivered/completed orders can be refunded)
    if (!['delivered', 'completed'].includes(order.currentStatus)) {
      throw new BadRequestException(
        'Order must be delivered before requesting a refund',
      );
    }

    // 3. Validate refund items belong to this order
    const orderItemIds = dto.items.map((item) => item.orderItemId);
    const orderItems = await this.prisma.orderItem.findMany({
      where: {
        id: { in: orderItemIds },
        orderId: dto.orderId,
      },
    });

    if (orderItems.length !== dto.items.length) {
      throw new BadRequestException(
        'Some items do not belong to this order',
      );
    }

    // 4. Validate quantities don't exceed original order quantities
    for (const refundItem of dto.items) {
      const orderItem = orderItems.find(
        (oi) => oi.id === refundItem.orderItemId,
      );

      if (!orderItem) {
        throw new NotFoundException(
          `Order item ${refundItem.orderItemId} not found`,
        );
      }

      if (refundItem.quantity > orderItem.quantity) {
        throw new BadRequestException(
          `Refund quantity (${refundItem.quantity}) exceeds order quantity (${orderItem.quantity}) for item ${refundItem.orderItemId}`,
        );
      }
    }

    // 5. Group refund items by organization (multi-vendor support)
    const itemsByOrg = new Map<number, any[]>();

    for (const refundItem of dto.items) {
      const orderItem = orderItems.find(
        (oi) => oi.id === refundItem.orderItemId,
      );
      const orgId = orderItem!.organizationId;

      if (!itemsByOrg.has(orgId)) {
        itemsByOrg.set(orgId, []);
      }
      itemsByOrg.get(orgId)!.push({ refundItem, orderItem });
    }

    // 6. Create separate refund for each organization
    const refunds: Refund[] = [];

    for (const [orgId, items] of itemsByOrg.entries()) {
      let totalAmount = 0;
      let totalOrgAmount = 0;

      const refundItemsData: Array<{
        orderItemId: number;
        quantity: number;
        amount: number;
      }> = [];

      // Calculate amounts for each item
      for (const { refundItem, orderItem } of items) {
        // Calculate proportional amounts for partial quantity refunds
        const refundRatio = refundItem.quantity / orderItem.quantity;
        const itemAmount =
          refundItem.amount || orderItem.lineTotal * refundRatio;
        const orgAmount = orderItem.organizationAmount * refundRatio;

        totalAmount += itemAmount;
        totalOrgAmount += orgAmount;

        refundItemsData.push({
          orderItemId: refundItem.orderItemId,
          quantity: refundItem.quantity,
          amount: itemAmount,
        });
      }

      // Create refund in transaction
      const refund = await this.unitOfWork.transaction(async (tx) => {
        // Create refund record
        const newRefund = await tx.refund.create({
          data: {
            orderId: dto.orderId,
            organizationId: orgId,
            amount: totalAmount,
            organizationAmount: totalOrgAmount,
            currency: 'USD',
            status: RefundStatus.requested,
            reason: dto.reason,
            refundItems: {
              create: refundItemsData,
            },
          },
          include: {
            refundItems: true,
            order: true,
            organization: true,
          },
        });

        // Deduct from vendor balance immediately (holds funds)
        try {
          await this.vendorBalanceProvider.debitForRefund({
            organizationId: orgId,
            amount: totalOrgAmount,
            refundId: newRefund.id,
            orderId: dto.orderId,
            description: `Refund requested for Order #${order.externalRef} - ${dto.reason}`,
          });

          this.logger.log(
            `Debited ${totalOrgAmount} from organization ${orgId} for refund ${newRefund.id}`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to debit balance for refund ${newRefund.id}`,
            error,
          );
          throw new BadRequestException(
            'Failed to process refund: Insufficient vendor balance',
          );
        }

        return newRefund;
      });

      refunds.push(refund);
    }

    this.logger.log(
      `Created ${refunds.length} refund(s) for order ${dto.orderId}`,
    );

    return refunds;
  }

  /**
   * Approve refund (platform admin)
   */
  async approveRefund(
    refundId: number,
    approvedBy: number,
    notes?: string,
  ): Promise<Refund> {
    const refund = await this.refundRepository.findById(refundId);

    if (!refund) {
      throw new NotFoundException(`Refund ${refundId} not found`);
    }

    if (refund.status !== RefundStatus.requested) {
      throw new BadRequestException(
        `Refund must be in 'requested' status to approve`,
      );
    }

    // Update status to approved
    const updated = await this.refundRepository.update(refundId, {
      status: RefundStatus.approved,
    });

    this.logger.log(
      `Refund ${refundId} approved by user ${approvedBy} for organization ${refund.organizationId}`,
    );

    // Note: Actual payment processing would happen here
    // For now, we mark as approved and platform can process payment separately

    return updated;
  }

  /**
   * Reject refund (platform admin)
   * Reverses the balance deduction
   */
  async rejectRefund(
    refundId: number,
    reason: string,
    rejectedBy: number,
  ): Promise<Refund> {
    const refund = await this.refundRepository.findById(refundId);

    if (!refund) {
      throw new NotFoundException(`Refund ${refundId} not found`);
    }

    if (refund.status !== RefundStatus.requested) {
      throw new BadRequestException(
        'Only requested refunds can be rejected',
      );
    }

    return this.unitOfWork.transaction(async (tx) => {
      // Update refund status
      const updated = await tx.refund.update({
        where: { id: refundId },
        data: {
          status: RefundStatus.rejected,
          reason: reason,
        },
        include: {
          refundItems: true,
          order: true,
          organization: true,
        },
      });

      // Credit back vendor balance (reverse the debit from creation)
      await this.vendorBalanceProvider.creditFunds({
        organizationId: refund.organizationId!,
        amount: refund.organizationAmount!,
        orderId: refund.orderId,
        description: `Refund rejected - Balance restored for Order #${refund.order?.externalRef}`,
      });

      this.logger.log(
        `Refund ${refundId} rejected. Credited back ${refund.organizationAmount} to organization ${refund.organizationId}`,
      );

      return updated;
    });
  }

  /**
   * Mark refund as completed (after payment processing)
   */
  async completeRefund(refundId: number): Promise<Refund> {
    const refund = await this.refundRepository.findById(refundId);

    if (!refund) {
      throw new NotFoundException(`Refund ${refundId} not found`);
    }

    if (refund.status !== RefundStatus.approved) {
      throw new BadRequestException(
        'Refund must be approved before completing',
      );
    }

    const updated = await this.refundRepository.update(refundId, {
      status: RefundStatus.completed,
    });

    this.logger.log(`Refund ${refundId} marked as completed`);

    return updated;
  }

  /**
   * Get refunds for a specific order
   */
  async getOrderRefunds(orderId: number): Promise<Refund[]> {
    return this.refundRepository.findByOrderId(orderId);
  }

  /**
   * Get refunds for an organization (vendor)
   */
  async getOrganizationRefunds(
    organizationId: number,
    filterDto?: RefundFilterDto,
  ): Promise<any> {
    const filters: any = { organizationId };

    if (filterDto?.status) {
      filters.status = filterDto.status;
    }

    if (filterDto?.orderId) {
      filters.orderId = filterDto.orderId;
    }

    if (filterDto?.fromDate) {
      filters.fromDate = filterDto.fromDate;
    }

    if (filterDto?.toDate) {
      filters.toDate = filterDto.toDate;
    }

    return this.refundRepository.findWithFilters({
      filters,
      pagination: {
        page: filterDto?.page || 1,
        limit: filterDto?.limit || 10,
      },
    });
  }

  /**
   * Get refund by ID with organization check
   */
  async getRefundById(id: number, organizationId?: number): Promise<Refund> {
    const refund = await this.refundRepository.findById(id);

    if (!refund) {
      throw new NotFoundException(`Refund ${id} not found`);
    }

    // If organizationId provided, verify ownership
    if (organizationId && refund.organizationId !== organizationId) {
      throw new NotFoundException(`Refund ${id} not found`);
    }

    return refund;
  }

  /**
   * Get all refunds with filters (platform admin)
   */
  async getAllRefunds(filterDto: RefundFilterDto): Promise<any> {
    const filters: any = {};

    if (filterDto.organizationId) {
      filters.organizationId = filterDto.organizationId;
    }

    if (filterDto.status) {
      filters.status = filterDto.status;
    }

    if (filterDto.orderId) {
      filters.orderId = filterDto.orderId;
    }

    if (filterDto.fromDate) {
      filters.fromDate = filterDto.fromDate;
    }

    if (filterDto.toDate) {
      filters.toDate = filterDto.toDate;
    }

    return this.refundRepository.findWithFilters({
      filters,
      pagination: {
        page: filterDto.page || 1,
        limit: filterDto.limit || 10,
      },
    });
  }

  /**
   * Get refund statistics
   */
  async getRefundStats(organizationId?: number): Promise<any> {
    return this.refundRepository.getRefundStats(organizationId);
  }

  /**
   * Cancel refund request (customer can cancel before approval)
   */
  async cancelRefund(refundId: number, userId: number): Promise<Refund> {
    const refund = await this.refundRepository.findById(refundId);

    if (!refund) {
      throw new NotFoundException(`Refund ${refundId} not found`);
    }

    // Verify order belongs to user
    const order = await this.prisma.order.findUnique({
      where: { id: refund.orderId },
    });

    if (order?.userId !== userId) {
      throw new BadRequestException('You can only cancel your own refunds');
    }

    if (refund.status !== RefundStatus.requested) {
      throw new BadRequestException(
        'Only requested refunds can be cancelled',
      );
    }

    return this.unitOfWork.transaction(async (tx) => {
      // Update status
      const updated = await tx.refund.update({
        where: { id: refundId },
        data: {
          status: RefundStatus.cancelled,
        },
        include: {
          refundItems: true,
          order: true,
          organization: true,
        },
      });

      // Credit back vendor balance
      if (refund.organizationId && refund.organizationAmount) {
        await this.vendorBalanceProvider.creditFunds({
          organizationId: refund.organizationId,
          amount: refund.organizationAmount,
          orderId: refund.orderId,
          description: `Refund cancelled by customer - Balance restored`,
        });
      }

      this.logger.log(`Refund ${refundId} cancelled by customer`);

      return updated;
    });
  }
}

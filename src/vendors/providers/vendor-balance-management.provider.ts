import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { VendorBalance, VendorBalanceTransaction, Prisma } from '@prisma/client';
import { VendorBalanceRepository } from '../repositories/vendor-balance.repository';
import { UnitOfWorkService } from 'src/shared/services/unit-of-work.service';

export enum BalanceTransactionType {
  CREDIT = 'credit',
  DEBIT = 'debit',
  HOLD = 'hold',
  RELEASE = 'release',
  PAYOUT = 'payout',
  REFUND = 'refund',
}

export interface HoldFundsDto {
  organizationId: number;
  amount: number;
  orderId: number;
  description?: string;
}

export interface ReleaseFundsDto {
  organizationId: number;
  amount: number;
  orderId: number;
  description?: string;
}

export interface RefundFundsDto {
  organizationId: number;
  amount: number;
  orderId: number;
  description?: string;
}

export interface DebitForRefundDto {
  organizationId: number;
  amount: number;
  refundId: number;
  orderId: number;
  description: string;
}

export interface CreditFundsDto {
  organizationId: number;
  amount: number;
  orderId: number;
  description: string;
}

@Injectable()
export class VendorBalanceManagementProvider {
  private readonly logger = new Logger(VendorBalanceManagementProvider.name);

  constructor(
    private readonly vendorBalanceRepository: VendorBalanceRepository,
    private readonly unitOfWork: UnitOfWorkService,
  ) {}

  /**
   * Get or create vendor balance for an organization
   */
  async getOrCreateBalance(organizationId: number): Promise<VendorBalance> {
    let balance =
      await this.vendorBalanceRepository.findByOrganizationId(organizationId);

    if (!balance) {
      this.logger.log(
        `Creating new vendor balance for organization ${organizationId}`,
      );

      balance = await this.vendorBalanceRepository.create({
        organizationId: organizationId,
        availableBalance: 0,
        pendingBalance: 0,
        totalEarnings: 0,
        totalPaidOut: 0,
      } as any);
    }

    return balance;
  }

  /**
   * Hold funds when an order is placed (pending balance)
   * Funds are held until the vendor ships the items
   */
  async holdFunds(dto: HoldFundsDto): Promise<VendorBalance> {
    const balance = await this.getOrCreateBalance(dto.organizationId);

    return this.unitOfWork.transaction(async (tx) => {
      // Update balance - move to pending
      const updatedBalance = await tx.vendorBalance.update({
        where: { id: balance.id },
        data: {
          pendingBalance: { increment: dto.amount },
          totalEarnings: { increment: dto.amount },
          updatedAt: new Date(),
        },
      });

      // Create transaction record
      await tx.vendorBalanceTransaction.create({
        data: {
          balanceId: balance.id,
          type: BalanceTransactionType.HOLD,
          amount: dto.amount,
          description:
            dto.description || `Order #${dto.orderId} - Funds on hold`,
          referenceType: 'order',
          referenceId: dto.orderId,
          balanceBefore: balance.pendingBalance,
          balanceAfter: balance.pendingBalance + dto.amount,
        },
      });

      this.logger.log(
        `Held ${dto.amount} for organization ${dto.organizationId} (Order #${dto.orderId})`,
      );

      return updatedBalance;
    });
  }

  /**
   * Release funds when vendor ships items (pending → available)
   */
  async releaseFunds(dto: ReleaseFundsDto): Promise<VendorBalance> {
    const balance = await this.getOrCreateBalance(dto.organizationId);

    if (balance.pendingBalance < dto.amount) {
      throw new BadRequestException(
        `Insufficient pending balance. Available: ${balance.pendingBalance}, Requested: ${dto.amount}`,
      );
    }

    return this.unitOfWork.transaction(async (tx) => {
      // Update balance - move from pending to available
      const updatedBalance = await tx.vendorBalance.update({
        where: { id: balance.id },
        data: {
          pendingBalance: { decrement: dto.amount },
          availableBalance: { increment: dto.amount },
          updatedAt: new Date(),
        },
      });

      // Create transaction record
      await tx.vendorBalanceTransaction.create({
        data: {
          balanceId: balance.id,
          type: BalanceTransactionType.RELEASE,
          amount: dto.amount,
          description:
            dto.description || `Order #${dto.orderId} - Funds released`,
          referenceType: 'order',
          referenceId: dto.orderId,
          balanceBefore: balance.availableBalance,
          balanceAfter: balance.availableBalance + dto.amount,
        },
      });

      this.logger.log(
        `Released ${dto.amount} for organization ${dto.organizationId} (Order #${dto.orderId})`,
      );

      return updatedBalance;
    });
  }

  /**
   * Refund funds when order is cancelled/refunded
   * Removes from pending balance and total earnings
   */
  async refundFunds(dto: RefundFundsDto): Promise<VendorBalance> {
    const balance = await this.getOrCreateBalance(dto.organizationId);

    if (balance.pendingBalance < dto.amount) {
      throw new BadRequestException(
        `Insufficient pending balance for refund. Available: ${balance.pendingBalance}, Requested: ${dto.amount}`,
      );
    }

    return this.unitOfWork.transaction(async (tx) => {
      // Update balance - remove from pending and total earnings
      const updatedBalance = await tx.vendorBalance.update({
        where: { id: balance.id },
        data: {
          pendingBalance: { decrement: dto.amount },
          totalEarnings: { decrement: dto.amount },
          updatedAt: new Date(),
        },
      });

      // Create transaction record
      await tx.vendorBalanceTransaction.create({
        data: {
          balanceId: balance.id,
          type: BalanceTransactionType.REFUND,
          amount: dto.amount,
          description:
            dto.description || `Order #${dto.orderId} - Refund processed`,
          referenceType: 'order',
          referenceId: dto.orderId,
          balanceBefore: balance.pendingBalance,
          balanceAfter: balance.pendingBalance - dto.amount,
        },
      });

      this.logger.log(
        `Refunded ${dto.amount} for organization ${dto.organizationId} (Order #${dto.orderId})`,
      );

      return updatedBalance;
    });
  }

  /**
   * Debit funds for refund (Phase 9: Post-delivery refunds)
   * Deducts from available balance when customer requests refund
   */
  async debitForRefund(dto: DebitForRefundDto): Promise<VendorBalance> {
    const balance = await this.getOrCreateBalance(dto.organizationId);

    // Check if available balance is sufficient
    if (balance.availableBalance < dto.amount) {
      throw new BadRequestException(
        `Insufficient available balance for refund. Available: ${balance.availableBalance}, Required: ${dto.amount}`,
      );
    }

    return this.unitOfWork.transaction(async (tx) => {
      // Deduct from available balance and total earnings
      const updatedBalance = await tx.vendorBalance.update({
        where: { id: balance.id },
        data: {
          availableBalance: { decrement: dto.amount },
          totalEarnings: { decrement: dto.amount },
          updatedAt: new Date(),
        },
      });

      // Create transaction record
      await tx.vendorBalanceTransaction.create({
        data: {
          balanceId: balance.id,
          type: BalanceTransactionType.REFUND,
          amount: dto.amount,
          description: dto.description,
          referenceType: 'refund',
          referenceId: dto.refundId,
          balanceBefore: balance.availableBalance,
          balanceAfter: balance.availableBalance - dto.amount,
        },
      });

      this.logger.log(
        `Debited ${dto.amount} from organization ${dto.organizationId} for refund #${dto.refundId}`,
      );

      return updatedBalance;
    });
  }

  /**
   * Credit funds (Phase 9: Reverse refund when rejected/cancelled)
   * Adds funds back to available balance
   */
  async creditFunds(dto: CreditFundsDto): Promise<VendorBalance> {
    const balance = await this.getOrCreateBalance(dto.organizationId);

    return this.unitOfWork.transaction(async (tx) => {
      // Add to available balance and total earnings
      const updatedBalance = await tx.vendorBalance.update({
        where: { id: balance.id },
        data: {
          availableBalance: { increment: dto.amount },
          totalEarnings: { increment: dto.amount },
          updatedAt: new Date(),
        },
      });

      // Create transaction record
      await tx.vendorBalanceTransaction.create({
        data: {
          balanceId: balance.id,
          type: BalanceTransactionType.CREDIT,
          amount: dto.amount,
          description: dto.description,
          referenceType: 'order',
          referenceId: dto.orderId,
          balanceBefore: balance.availableBalance,
          balanceAfter: balance.availableBalance + dto.amount,
        },
      });

      this.logger.log(
        `Credited ${dto.amount} to organization ${dto.organizationId} (Order #${dto.orderId})`,
      );

      return updatedBalance;
    });
  }

  /**
   * Process payout - deduct from available balance
   */
  async processPayout(
    organizationId: number,
    amount: number,
    payoutId: number,
  ): Promise<VendorBalance> {
    const balance = await this.getOrCreateBalance(organizationId);

    if (balance.availableBalance < amount) {
      throw new BadRequestException(
        `Insufficient available balance for payout. Available: ${balance.availableBalance}, Requested: ${amount}`,
      );
    }

    return this.unitOfWork.transaction(async (tx) => {
      // Update balance
      const updatedBalance = await tx.vendorBalance.update({
        where: { id: balance.id },
        data: {
          availableBalance: { decrement: amount },
          totalPaidOut: { increment: amount },
          lastPayoutAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Create transaction record
      await tx.vendorBalanceTransaction.create({
        data: {
          balanceId: balance.id,
          type: BalanceTransactionType.PAYOUT,
          amount: amount,
          description: `Payout #${payoutId}`,
          referenceType: 'payout',
          referenceId: payoutId,
          balanceBefore: balance.availableBalance,
          balanceAfter: balance.availableBalance - amount,
        },
      });

      this.logger.log(
        `Processed payout of ${amount} for organization ${organizationId} (Payout #${payoutId})`,
      );

      return updatedBalance;
    });
  }

  /**
   * Get balance for an organization
   */
  async getBalance(organizationId: number): Promise<VendorBalance> {
    const balance = await this.vendorBalanceRepository.findByOrganizationId(
      organizationId,
    );

    if (!balance) {
      throw new NotFoundException(
        `Balance not found for organization ${organizationId}`,
      );
    }

    return balance;
  }

  /**
   * Get transaction history for a vendor
   */
  async getTransactionHistory(
    organizationId: number,
    limit: number = 50,
  ): Promise<VendorBalanceTransaction[]> {
    const balance = await this.getBalance(organizationId);
    return this.vendorBalanceRepository.getTransactionsByBalanceId(
      balance.id,
      limit,
    );
  }

  /**
   * Get balance summary for all vendors
   */
  async getAllBalancesSummary(): Promise<any> {
    return this.vendorBalanceRepository.getBalancesSummary();
  }

  /**
   * Get vendors with low or negative balances
   */
  async getVendorsWithLowBalance(threshold: number = 0): Promise<VendorBalance[]> {
    return this.vendorBalanceRepository.getBalancesWithLowFunds(threshold);
  }

  /**
   * Create payout request (Phase 7)
   * This moves funds from available to pending and creates a payout record
   */
  async createPayoutRequest(
    organizationId: number,
    amount: number,
    notes?: string,
  ) {
    const balance = await this.getOrCreateBalance(organizationId);

    if (balance.availableBalance < amount) {
      throw new BadRequestException(
        `Insufficient available balance. Available: ${balance.availableBalance}, Requested: ${amount}`,
      );
    }

    return this.unitOfWork.transaction(async (tx) => {
      // Move funds from available to pending (hold for payout)
      const updatedBalance = await tx.vendorBalance.update({
        where: { id: balance.id },
        data: {
          availableBalance: { decrement: amount },
          pendingBalance: { increment: amount },
          updatedAt: new Date(),
        },
      });

      // Create payout record
      const payout = await tx.vendorPayout.create({
        data: {
          organizationId,
          balanceId: balance.id,
          amount,
          currency: 'USD',
          status: 'pending',
          method: 'bank_transfer', // Default method
          scheduledDate: new Date(), // Immediate request
        },
      });

      // Create transaction record
      await tx.vendorBalanceTransaction.create({
        data: {
          balanceId: balance.id,
          type: BalanceTransactionType.DEBIT,
          amount,
          description: notes || `Payout request #${payout.id}`,
          referenceType: 'payout',
          referenceId: payout.id,
          balanceBefore: balance.availableBalance,
          balanceAfter: balance.availableBalance - amount,
        },
      });

      return {
        payout,
        balance: updatedBalance,
      };
    });
  }
}

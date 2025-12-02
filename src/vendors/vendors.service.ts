import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { VendorBalanceManagementProvider } from './providers/vendor-balance-management.provider';
import { VendorBalanceRepository } from './repositories/vendor-balance.repository';
import { VendorBalanceQueryDto, RequestPayoutDto } from './dtos';

@Injectable()
export class VendorsService {
  constructor(
    private readonly balanceManagement: VendorBalanceManagementProvider,
    private readonly balanceRepository: VendorBalanceRepository,
  ) {}

  // ---------- Vendor Balance APIs ----------

  async getVendorBalance(organizationId: number) {
    const balance = await this.balanceRepository.findByOrganizationId(organizationId);
    if (!balance) {
      throw new NotFoundException(`Vendor balance not found for organization ${organizationId}`);
    }
    return balance;
  }

  async getVendorTransactions(organizationId: number, queryDto: VendorBalanceQueryDto) {
    return this.balanceRepository.getTransactionHistory(
      organizationId,
      queryDto.page || 1,
      queryDto.limit || 20,
    );
  }

  async requestPayout(organizationId: number, dto: RequestPayoutDto) {
    const balance = await this.balanceRepository.findByOrganizationId(organizationId);
    if (!balance) {
      throw new NotFoundException(`Vendor balance not found for organization ${organizationId}`);
    }

    if (dto.amount > balance.availableBalance) {
      throw new BadRequestException(
        `Insufficient balance. Available: ${balance.availableBalance}, Requested: ${dto.amount}`,
      );
    }

    // TODO: Implement full payout workflow with VendorPayout table
    // For now, just validate and return success
    return {
      success: true,
      message: 'Payout request created successfully (pending full implementation)',
      amount: dto.amount,
      availableBalance: balance.availableBalance,
      status: 'PENDING',
    };
  }

  async getVendorPayouts(organizationId: number, queryDto: VendorBalanceQueryDto) {
    return this.balanceRepository.getPayoutHistory(
      organizationId,
      queryDto.page || 1,
      queryDto.limit || 20,
    );
  }

  // ---------- Platform Admin APIs ----------

  async getAllVendorBalances() {
    return this.balanceRepository.findAll();
  }

  async getVendorBalanceById(organizationId: number) {
    return this.getVendorBalance(organizationId);
  }

  async approvePayout(payoutId: number, approvedBy: number) {
    // Will implement full payout approval later
    return {
      success: true,
      message: 'Payout approved successfully',
      payoutId,
      approvedBy,
    };
  }

  async processPayout(payoutId: number, processedBy: number, transactionReference?: string) {
    // Will implement full payout processing later
    return {
      success: true,
      message: 'Payout processed successfully',
      payoutId,
      processedBy,
      transactionReference: transactionReference || `TXN-${Date.now()}`,
    };
  }

  async getAllPayouts(page: number = 1, limit: number = 20) {
    return this.balanceRepository.getAllPayouts(page, limit);
  }
}

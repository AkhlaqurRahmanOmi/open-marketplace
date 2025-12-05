import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/core/config/prisma/prisma.service';

export interface CommissionConfig {
  feeType: string | null;
  feeAmount: number | null;
}

export interface CommissionResult {
  lineTotal: number;
  platformFeeAmount: number;
  organizationAmount: number;
  feeType: string;
  feeRate: number;
}

@Injectable()
export class CommissionCalculatorProvider {
  private readonly logger = new Logger(CommissionCalculatorProvider.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate commission for an order item based on organization's fee configuration
   * @param lineTotal - Total amount for the line item
   * @param organizationId - ID of the vendor organization
   * @returns Commission breakdown
   */
  async calculateCommission(
    lineTotal: number,
    organizationId: number,
  ): Promise<CommissionResult> {
    // Fetch organization with fee configuration
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        feeType: true,
        feeAmount: true,
        type: true,
      },
    });

    if (!organization) {
      this.logger.warn(
        `Organization ${organizationId} not found, using zero commission`,
      );
      return {
        lineTotal,
        platformFeeAmount: 0,
        organizationAmount: lineTotal,
        feeType: 'none',
        feeRate: 0,
      };
    }

    // Get fee configuration from organization or fall back to organization type defaults
    let feeType = organization.feeType;
    let feeAmount = organization.feeAmount;

    // If organization doesn't have custom fee, use defaults from OrganizationType
    if (!feeType || feeAmount === null || feeAmount === undefined) {
      const orgType = await this.prisma.organizationType.findFirst({
        where: { code: organization.type },
        select: {
          defaultFeeType: true,
          defaultFeeAmount: true,
        },
      });

      if (orgType) {
        feeType = orgType.defaultFeeType;
        feeAmount = orgType.defaultFeeAmount;
      }
    }

    // Calculate commission based on fee type
    const result = this.calculateCommissionFromConfig(lineTotal, {
      feeType,
      feeAmount,
    });

    this.logger.debug(
      `Commission calculated for org ${organization.name}: ${JSON.stringify(result)}`,
    );

    return result;
  }

  /**
   * Calculate commission from a provided configuration
   * @param lineTotal - Total amount for the line item
   * @param config - Fee configuration
   * @returns Commission breakdown
   */
  calculateCommissionFromConfig(
    lineTotal: number,
    config: CommissionConfig,
  ): CommissionResult {
    let platformFeeAmount = 0;
    const feeType = config.feeType || 'none';
    const feeRate = config.feeAmount || 0;

    if (lineTotal <= 0) {
      return {
        lineTotal,
        platformFeeAmount: 0,
        organizationAmount: lineTotal,
        feeType,
        feeRate: 0,
      };
    }

    switch (feeType) {
      case 'percentage':
        // Calculate percentage-based fee
        platformFeeAmount = lineTotal * (feeRate / 100);
        break;

      case 'fixed':
        // Fixed fee per transaction
        platformFeeAmount = feeRate;
        break;

      default:
        // No commission
        platformFeeAmount = 0;
        break;
    }

    // Ensure platform fee doesn't exceed line total
    platformFeeAmount = Math.min(platformFeeAmount, lineTotal);

    // Calculate vendor's portion
    const organizationAmount = lineTotal - platformFeeAmount;

    return {
      lineTotal,
      platformFeeAmount: Number(platformFeeAmount.toFixed(2)),
      organizationAmount: Number(organizationAmount.toFixed(2)),
      feeType,
      feeRate,
    };
  }

  /**
   * Calculate total commission for multiple items
   * @param items - Array of {lineTotal, organizationId}
   * @returns Aggregated commission data
   */
  async calculateBulkCommission(
    items: Array<{ lineTotal: number; organizationId: number }>,
  ): Promise<{
    totalLineTotal: number;
    totalPlatformFee: number;
    totalOrganizationAmount: number;
    breakdown: CommissionResult[];
  }> {
    const breakdown = await Promise.all(
      items.map((item) =>
        this.calculateCommission(item.lineTotal, item.organizationId),
      ),
    );

    const totals = breakdown.reduce(
      (acc, result) => {
        acc.totalLineTotal += result.lineTotal;
        acc.totalPlatformFee += result.platformFeeAmount;
        acc.totalOrganizationAmount += result.organizationAmount;
        return acc;
      },
      {
        totalLineTotal: 0,
        totalPlatformFee: 0,
        totalOrganizationAmount: 0,
      },
    );

    return {
      ...totals,
      breakdown,
    };
  }

  /**
   * Get commission preview without saving
   * Useful for showing users commission breakdown before order placement
   */
  async getCommissionPreview(
    organizationId: number,
    amount: number,
  ): Promise<CommissionResult> {
    return this.calculateCommission(amount, organizationId);
  }
}

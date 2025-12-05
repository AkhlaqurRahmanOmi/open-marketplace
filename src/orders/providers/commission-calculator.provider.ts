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
  commissionSource?: string; // 'product' | 'category' | 'vendor' | 'organization_type' | 'none'
}

// New interface for passing commission hierarchy data
export interface CommissionHierarchyData {
  product?: {
    feeType: string | null;
    feeAmount: number | null;
  };
  category?: {
    feeType: string | null;
    feeAmount: number | null;
  };
  organization: {
    feeType: string | null;
    feeAmount: number | null;
    type: string;
  };
  organizationType?: {
    defaultFeeType: string | null;
    defaultFeeAmount: number | null;
  };
}

@Injectable()
export class CommissionCalculatorProvider {
  private readonly logger = new Logger(CommissionCalculatorProvider.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * OPTIMIZED: Calculate commission using pre-loaded data (zero additional queries)
   * Product → Category → Vendor → Organization Type hierarchy
   * @param lineTotal - Total amount for the line item
   * @param data - Pre-loaded commission hierarchy data
   * @returns Commission breakdown with source indicator
   */
  calculateCommissionFromData(
    lineTotal: number,
    data: CommissionHierarchyData,
  ): CommissionResult {
    let feeType: string | null = null;
    let feeAmount: number | null = null;
    let commissionSource = 'none';

    // 1. Try product-level commission (highest priority)
    if (data.product?.feeType && data.product?.feeAmount !== null && data.product?.feeAmount !== undefined) {
      feeType = data.product.feeType;
      feeAmount = data.product.feeAmount;
      commissionSource = 'product';
      this.logger.debug(
        `Using product-level commission: ${feeType} - ${feeAmount}`,
      );
    }
    // 2. Try category-level commission
    else if (data.category?.feeType && data.category?.feeAmount !== null && data.category?.feeAmount !== undefined) {
      feeType = data.category.feeType;
      feeAmount = data.category.feeAmount;
      commissionSource = 'category';
      this.logger.debug(
        `Using category-level commission: ${feeType} - ${feeAmount}`,
      );
    }
    // 3. Try vendor-level commission
    else if (data.organization.feeType && data.organization.feeAmount !== null && data.organization.feeAmount !== undefined) {
      feeType = data.organization.feeType;
      feeAmount = data.organization.feeAmount;
      commissionSource = 'vendor';
      this.logger.debug(
        `Using vendor-level commission: ${feeType} - ${feeAmount}`,
      );
    }
    // 4. Fall back to organization type defaults
    else if (data.organizationType?.defaultFeeType && data.organizationType?.defaultFeeAmount !== null) {
      feeType = data.organizationType.defaultFeeType;
      feeAmount = data.organizationType.defaultFeeAmount;
      commissionSource = 'organization_type';
      this.logger.debug(
        `Using organization type default commission: ${feeType} - ${feeAmount}`,
      );
    }

    // Calculate commission based on fee type
    const result = this.calculateCommissionFromConfig(lineTotal, {
      feeType,
      feeAmount,
    });

    this.logger.debug(
      `Commission calculated (source: ${commissionSource}): ${JSON.stringify(result)}`,
    );

    return {
      ...result,
      commissionSource,
    };
  }

  /**
   * LEGACY: Calculate commission for an order item with multi-level hierarchy (uses database queries)
   * Product → Category → Vendor → Organization Type
   * @deprecated Use calculateCommissionFromData() for better performance
   * @param lineTotal - Total amount for the line item
   * @param organizationId - ID of the vendor organization
   * @param productId - Optional product ID for product-level commission
   * @param categoryId - Optional category ID for category-level commission
   * @returns Commission breakdown with source indicator
   */
  async calculateCommission(
    lineTotal: number,
    organizationId: number,
    productId?: number,
    categoryId?: number,
  ): Promise<CommissionResult> {
    let feeType: string | null = null;
    let feeAmount: number | null = null;
    let commissionSource = 'none';

    // 1. Try to get product-level commission (highest priority)
    if (productId) {
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
        select: { feeType: true, feeAmount: true, name: true },
      });

      if (product?.feeType && product?.feeAmount !== null && product?.feeAmount !== undefined) {
        feeType = product.feeType;
        feeAmount = product.feeAmount;
        commissionSource = 'product';
        this.logger.debug(
          `Using product-level commission for product ${product.name}: ${feeType} - ${feeAmount}`,
        );
      }
    }

    // 2. If no product commission, try category-level commission
    if (!feeType && categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: categoryId },
        select: { feeType: true, feeAmount: true, name: true },
      });

      if (category?.feeType && category?.feeAmount !== null && category?.feeAmount !== undefined) {
        feeType = category.feeType;
        feeAmount = category.feeAmount;
        commissionSource = 'category';
        this.logger.debug(
          `Using category-level commission for category ${category.name}: ${feeType} - ${feeAmount}`,
        );
      }
    }

    // 3. If no product or category commission, try vendor-level commission
    if (!feeType) {
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
          commissionSource: 'none',
        };
      }

      // Check if organization has custom commission
      if (organization.feeType && organization.feeAmount !== null && organization.feeAmount !== undefined) {
        feeType = organization.feeType;
        feeAmount = organization.feeAmount;
        commissionSource = 'vendor';
        this.logger.debug(
          `Using vendor-level commission for ${organization.name}: ${feeType} - ${feeAmount}`,
        );
      } else {
        // 4. Fall back to organization type defaults
        const orgType = await this.prisma.organizationType.findFirst({
          where: { code: organization.type },
          select: {
            defaultFeeType: true,
            defaultFeeAmount: true,
          },
        });

        if (orgType && orgType.defaultFeeType && orgType.defaultFeeAmount !== null) {
          feeType = orgType.defaultFeeType;
          feeAmount = orgType.defaultFeeAmount;
          commissionSource = 'organization_type';
          this.logger.debug(
            `Using organization type default commission: ${feeType} - ${feeAmount}`,
          );
        }
      }
    }

    // Calculate commission based on fee type
    const result = this.calculateCommissionFromConfig(lineTotal, {
      feeType,
      feeAmount,
    });

    this.logger.debug(
      `Commission calculated (source: ${commissionSource}): ${JSON.stringify(result)}`,
    );

    return {
      ...result,
      commissionSource,
    };
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
   * @param items - Array of {lineTotal, organizationId, productId?, categoryId?}
   * @returns Aggregated commission data
   */
  async calculateBulkCommission(
    items: Array<{
      lineTotal: number;
      organizationId: number;
      productId?: number;
      categoryId?: number;
    }>,
  ): Promise<{
    totalLineTotal: number;
    totalPlatformFee: number;
    totalOrganizationAmount: number;
    breakdown: CommissionResult[];
  }> {
    const breakdown = await Promise.all(
      items.map((item) =>
        this.calculateCommission(
          item.lineTotal,
          item.organizationId,
          item.productId,
          item.categoryId,
        ),
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
    productId?: number,
    categoryId?: number,
  ): Promise<CommissionResult> {
    return this.calculateCommission(amount, organizationId, productId, categoryId);
  }
}

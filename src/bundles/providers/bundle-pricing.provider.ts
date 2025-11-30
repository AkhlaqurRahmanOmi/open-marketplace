import { Injectable } from '@nestjs/common';
import { BundleRepository } from '../repositories';

export interface BundlePricingInfo {
  bundleId: number;
  bundlePrice: number;
  individualPrice: number;
  savings: number;
  savingsPercent: number;
}

@Injectable()
export class BundlePricingProvider {
  constructor(private readonly bundleRepository: BundleRepository) {}

  /**
   * Calculate pricing information for a bundle including savings
   */
  async calculateBundlePricing(bundleId: number): Promise<BundlePricingInfo> {
    const bundle: any = await this.bundleRepository.findByIdWithItems(bundleId);

    if (!bundle) {
      throw new Error(`Bundle with ID ${bundleId} not found`);
    }

    // Calculate sum of individual variant prices
    let individualPrice = 0;
    for (const item of bundle.bundleItems) {
      individualPrice += item.variant.price * item.quantity;
    }

    const bundlePrice = bundle.price;
    const savings = individualPrice - bundlePrice;
    const savingsPercent = individualPrice > 0 ? (savings / individualPrice) * 100 : 0;

    return {
      bundleId: bundle.id,
      bundlePrice,
      individualPrice,
      savings: Math.max(0, savings), // Ensure non-negative
      savingsPercent: Math.max(0, savingsPercent), // Ensure non-negative
    };
  }

  /**
   * Calculate pricing for multiple bundles
   */
  async calculateMultipleBundlePricing(
    bundleIds: number[],
  ): Promise<BundlePricingInfo[]> {
    const pricingInfos = await Promise.all(
      bundleIds.map((id) => this.calculateBundlePricing(id)),
    );

    return pricingInfos;
  }

  /**
   * Get bundles sorted by savings amount (highest first)
   */
  async getBundlesSortedBySavings(): Promise<BundlePricingInfo[]> {
    const bundles = await this.bundleRepository.findActiveBundles();

    const pricingInfos = await Promise.all(
      bundles.map((bundle) => this.calculateBundlePricing(bundle.id)),
    );

    // Sort by savings amount (descending)
    return pricingInfos.sort((a, b) => b.savings - a.savings);
  }

  /**
   * Get bundles sorted by savings percentage (highest first)
   */
  async getBundlesSortedBySavingsPercent(): Promise<BundlePricingInfo[]> {
    const bundles = await this.bundleRepository.findActiveBundles();

    const pricingInfos = await Promise.all(
      bundles.map((bundle) => this.calculateBundlePricing(bundle.id)),
    );

    // Sort by savings percentage (descending)
    return pricingInfos.sort((a, b) => b.savingsPercent - a.savingsPercent);
  }
}

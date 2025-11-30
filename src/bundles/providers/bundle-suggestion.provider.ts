import { Injectable } from '@nestjs/common';
import { Bundle } from '@prisma/client';
import { BundleRepository } from '../repositories';
import { BundlePricingProvider, BundlePricingInfo } from './bundle-pricing.provider';

export interface BundleSuggestion {
  bundle: Bundle;
  pricing: BundlePricingInfo;
}

@Injectable()
export class BundleSuggestionProvider {
  constructor(
    private readonly bundleRepository: BundleRepository,
    private readonly pricingProvider: BundlePricingProvider,
  ) {}

  /**
   * Find bundles containing a specific variant
   */
  async findBundlesForVariant(variantId: number): Promise<BundleSuggestion[]> {
    const bundles = await this.bundleRepository.findBundlesContainingVariant(variantId);

    const suggestions = await Promise.all(
      bundles.map(async (bundle) => ({
        bundle,
        pricing: await this.pricingProvider.calculateBundlePricing(bundle.id),
      })),
    );

    // Sort by savings (highest first)
    return suggestions.sort((a, b) => b.pricing.savings - a.pricing.savings);
  }

  /**
   * Find bundles containing any of the specified variants
   */
  async findBundlesForVariants(variantIds: number[]): Promise<BundleSuggestion[]> {
    const bundles = await this.bundleRepository.findBundlesContainingVariants(variantIds);

    // Remove duplicates (a bundle might contain multiple variants from the list)
    const uniqueBundles = Array.from(
      new Map(bundles.map((b) => [b.id, b])).values(),
    );

    const suggestions = await Promise.all(
      uniqueBundles.map(async (bundle) => ({
        bundle,
        pricing: await this.pricingProvider.calculateBundlePricing(bundle.id),
      })),
    );

    // Sort by savings (highest first)
    return suggestions.sort((a, b) => b.pricing.savings - a.pricing.savings);
  }

  /**
   * Find top bundle suggestions for a variant (limited results)
   */
  async getTopSuggestionsForVariant(
    variantId: number,
    limit: number = 3,
  ): Promise<BundleSuggestion[]> {
    const suggestions = await this.findBundlesForVariant(variantId);
    return suggestions.slice(0, limit);
  }

  /**
   * Find top bundle suggestions for multiple variants (limited results)
   */
  async getTopSuggestionsForVariants(
    variantIds: number[],
    limit: number = 5,
  ): Promise<BundleSuggestion[]> {
    const suggestions = await this.findBundlesForVariants(variantIds);
    return suggestions.slice(0, limit);
  }

  /**
   * Get personalized bundle recommendations based on cart items
   * This can be enhanced with ML/recommendation algorithms in the future
   */
  async getCartBasedRecommendations(
    cartVariantIds: number[],
    limit: number = 3,
  ): Promise<BundleSuggestion[]> {
    if (!cartVariantIds || cartVariantIds.length === 0) {
      return [];
    }

    const suggestions = await this.findBundlesForVariants(cartVariantIds);

    // Filter bundles where user already has some items
    // and show bundles that complement their cart
    const recommendations = suggestions.filter((suggestion) => {
      const bundle: any = suggestion.bundle;
      if (!bundle.bundleItems) return false;
      const bundleVariantIds = bundle.bundleItems.map((item: any) => item.variantId);
      const hasAtLeastOneItem = bundleVariantIds.some((id: any) => cartVariantIds.includes(id));
      return hasAtLeastOneItem;
    });

    return recommendations.slice(0, limit);
  }
}

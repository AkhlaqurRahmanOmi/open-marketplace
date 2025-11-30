import { Injectable } from '@nestjs/common';
import {
  BundleManagementProvider,
  BundleValidationProvider,
  BundlePricingProvider,
  BundleSuggestionProvider,
} from './providers';
import { CreateBundleDto, UpdateBundleDto, BundleFilterDto } from './dtos';

/**
 * BundlesService is a facade that exposes a simplified API
 * while coordinating multiple underlying providers.
 */
@Injectable()
export class BundlesService {
  constructor(
    private readonly management: BundleManagementProvider,
    private readonly validation: BundleValidationProvider,
    private readonly pricing: BundlePricingProvider,
    private readonly suggestion: BundleSuggestionProvider,
  ) {}

  // ========== Bundle Management ==========

  createBundle(dto: CreateBundleDto) {
    return this.management.createBundle(dto);
  }

  updateBundle(id: number, dto: UpdateBundleDto) {
    return this.management.updateBundle(id, dto);
  }

  deleteBundle(id: number) {
    return this.management.deleteBundle(id);
  }

  getBundleById(id: number) {
    return this.management.getBundleById(id);
  }

  getAllBundles(filterDto: BundleFilterDto) {
    return this.management.getAllBundles(filterDto);
  }

  getActiveBundles() {
    return this.management.getActiveBundles();
  }

  addItemToBundle(bundleId: number, variantId: number, quantity: number) {
    return this.management.addItemToBundle(bundleId, variantId, quantity);
  }

  removeItemFromBundle(bundleId: number, itemId: number) {
    return this.management.removeItemFromBundle(bundleId, itemId);
  }

  // ========== Bundle Validation ==========

  validateBundleForOrder(bundleId: number, quantity: number) {
    return this.validation.validateBundleForOrder(bundleId, quantity);
  }

  checkBundleAvailability(bundleId: number, quantity: number = 1) {
    return this.validation.checkBundleAvailability(bundleId, quantity);
  }

  reserveBundleInventory(bundleId: number, quantity: number, orderId: number) {
    return this.validation.reserveBundleInventory(bundleId, quantity, orderId);
  }

  releaseBundleInventory(bundleId: number, quantity: number, orderId: number) {
    return this.validation.releaseBundleInventory(bundleId, quantity, orderId);
  }

  // ========== Bundle Pricing ==========

  calculateBundlePricing(bundleId: number) {
    return this.pricing.calculateBundlePricing(bundleId);
  }

  calculateMultipleBundlePricing(bundleIds: number[]) {
    return this.pricing.calculateMultipleBundlePricing(bundleIds);
  }

  getBundlesSortedBySavings() {
    return this.pricing.getBundlesSortedBySavings();
  }

  getBundlesSortedBySavingsPercent() {
    return this.pricing.getBundlesSortedBySavingsPercent();
  }

  // ========== Bundle Suggestions ==========

  findBundlesForVariant(variantId: number) {
    return this.suggestion.findBundlesForVariant(variantId);
  }

  findBundlesForVariants(variantIds: number[]) {
    return this.suggestion.findBundlesForVariants(variantIds);
  }

  getTopSuggestionsForVariant(variantId: number, limit: number = 3) {
    return this.suggestion.getTopSuggestionsForVariant(variantId, limit);
  }

  getTopSuggestionsForVariants(variantIds: number[], limit: number = 5) {
    return this.suggestion.getTopSuggestionsForVariants(variantIds, limit);
  }

  getCartBasedRecommendations(cartVariantIds: number[], limit: number = 3) {
    return this.suggestion.getCartBasedRecommendations(cartVariantIds, limit);
  }
}

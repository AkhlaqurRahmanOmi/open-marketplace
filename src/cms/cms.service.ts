import { Injectable } from '@nestjs/common';
import { HomepageManagementProvider } from './providers';
import { HomepageSection } from '@prisma/client';

/**
 * CmsService is a facade that coordinates CMS operations
 * Delegates business logic to HomepageManagementProvider
 */
@Injectable()
export class CmsService {
  constructor(
    private readonly homepageManagement: HomepageManagementProvider,
  ) {}

  // ========== Public Homepage API ==========

  /**
   * Get homepage data for frontend
   * Returns simple object structure
   */
  async getHomepage(): Promise<Record<string, any>> {
    return this.homepageManagement.getHomepage();
  }

  // ========== Admin API ==========

  /**
   * Get homepage data for admin panel
   */
  async getHomepageForAdmin(): Promise<HomepageSection | null> {
    return this.homepageManagement.getHomepageForAdmin();
  }

  /**
   * Update a specific section
   * @param sectionName - URL-friendly section name (e.g., 'hero-banner')
   * @param content - Section content as JSON
   */
  async updateSection(sectionName: string, content: any): Promise<any> {
    return this.homepageManagement.updateSection(sectionName, content);
  }
}

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { HomepageSection } from '@prisma/client';
import { HomepageSectionRepository } from '../repositories/homepage-section.repository';

/**
 * HomepageManagementProvider - Business logic for CMS homepage sections
 * Handles 10 static sections stored in a single database row
 */
@Injectable()
export class HomepageManagementProvider {
  private readonly logger = new Logger(HomepageManagementProvider.name);

  // Map of URL-friendly section names to database column names
  // ONLY STATIC SECTIONS (Dynamic sections use existing APIs)
  private readonly SECTION_MAP = {
    'header': 'header',
    'hero-banner': 'heroBanner',
    'features-bar': 'featuresBar',
    'our-story': 'ourStory',
    'store-locations': 'storeLocations',
    'footer': 'footer',
  } as const;

  constructor(
    private readonly homepageSectionRepo: HomepageSectionRepository,
  ) {}

  /**
   * Get homepage for public display
   * Returns simple object structure for frontend
   * ONLY static sections - dynamic sections use existing APIs
   */
  async getHomepage(): Promise<Record<string, any>> {
    this.logger.log('Fetching homepage static sections');
    const homepage = await this.homepageSectionRepo.findHomepage();

    if (!homepage) {
      throw new NotFoundException('Homepage not configured yet');
    }

    // Return only static sections as simple object
    return {
      header: homepage.header || null,
      heroBanner: homepage.heroBanner || null,
      featuresBar: homepage.featuresBar || null,
      ourStory: homepage.ourStory || null,
      storeLocations: homepage.storeLocations || null,
      footer: homepage.footer || null,
    };
  }

  /**
   * Get homepage record for admin (includes full database record)
   */
  async getHomepageForAdmin(): Promise<HomepageSection | null> {
    this.logger.log('Fetching homepage data for admin');
    return this.homepageSectionRepo.findHomepage();
  }

  /**
   * Update a specific section
   * @param sectionName - URL-friendly section name (e.g., 'hero-banner')
   * @param content - Section content as JSON
   */
  async updateSection(sectionName: string, content: any): Promise<any> {
    // Validate section name
    const columnName = this.SECTION_MAP[sectionName as keyof typeof this.SECTION_MAP];

    if (!columnName) {
      const validSections = Object.keys(this.SECTION_MAP).join(', ');
      throw new BadRequestException(
        `Invalid section name: ${sectionName}. Valid sections: ${validSections}`,
      );
    }

    this.logger.log(`Updating section: ${sectionName} (column: ${columnName})`);

    // Get or create homepage record
    let homepage = await this.homepageSectionRepo.findHomepage();

    if (!homepage) {
      // First time setup - create the row with this section
      this.logger.log('Creating initial homepage record');
      homepage = await this.homepageSectionRepo.create({
        [columnName]: content,
      });
    } else {
      // Update existing row
      homepage = await this.homepageSectionRepo.updateSection(
        homepage.id,
        columnName,
        content,
      );
    }

    // Return the updated section data
    return {
      section: sectionName,
      content: homepage[columnName],
      updatedAt: homepage.updatedAt,
    };
  }

  /**
   * Validate section content structure (optional - can add custom validation)
   */
  private validateSectionContent(sectionName: string, content: any): void {
    // Add custom validation rules per section if needed
    // For example:
    // if (sectionName === 'hero-banner' && !content.slides) {
    //   throw new BadRequestException('Hero banner must have slides');
    // }
  }
}

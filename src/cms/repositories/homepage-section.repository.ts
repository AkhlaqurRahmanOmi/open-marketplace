import { Injectable } from '@nestjs/common';
import { HomepageSection } from '@prisma/client';
import { PrismaService } from '../../core/config/prisma/prisma.service';

/**
 * HomepageSectionRepository handles direct database operations
 * for the homepage_section table (single row with 10 JSON columns)
 */
@Injectable()
export class HomepageSectionRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get the homepage record (should only be 1 row)
   */
  async findHomepage(): Promise<HomepageSection | null> {
    return this.prisma.homepageSection.findFirst();
  }

  /**
   * Create the homepage record (first time setup)
   */
  async create(data: Partial<HomepageSection>): Promise<HomepageSection> {
    return this.prisma.homepageSection.create({
      data: data as any,
    });
  }

  /**
   * Update a specific section column
   * @param id - Homepage record ID
   * @param columnName - Database column name (e.g., 'heroBanner')
   * @param content - JSON content for that section
   */
  async updateSection(
    id: number,
    columnName: string,
    content: any,
  ): Promise<HomepageSection> {
    return this.prisma.homepageSection.update({
      where: { id },
      data: {
        [columnName]: content,
      },
    });
  }

  /**
   * Update multiple sections at once
   */
  async updateMultipleSections(
    id: number,
    updates: Record<string, any>,
  ): Promise<HomepageSection> {
    return this.prisma.homepageSection.update({
      where: { id },
      data: updates,
    });
  }
}

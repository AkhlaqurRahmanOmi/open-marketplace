import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CmsService } from './cms.service';
import { Auth } from '../auth/decorator/auth.decorator';
import { AuthType } from '../auth/enums/auth-type.enum';
import { Permissions } from '../auth/decorator/permissions.decorator';
import { CacheTTL } from '../shared/decorators/cache-ttl.decorator';
import { UpdateSectionDto } from './dto/update-section.dto';

@Controller('cms')
export class CmsController {
  constructor(private readonly cmsService: CmsService) {}

  // ============ Public Endpoints ============

  /**
   * Get homepage data for frontend (Public)
   * Returns static sections only: { header, heroBanner, featuresBar, ourStory, storeLocations, footer }
   * Dynamic sections (products, events, reviews) use existing APIs
   * Cached for 5 minutes
   */
  @Get('homepage')
  @Auth(AuthType.None)
  @CacheTTL(300000) // 5 minutes
  @HttpCode(HttpStatus.OK)
  async getHomepage() {
    return this.cmsService.getHomepage();
  }

  // ============ Admin Endpoints ============

  /**
   * Get homepage data for admin (Admin)
   * Returns full database record with all sections
   */
  @Get('admin/homepage')
  @Permissions('cms:read')
  @HttpCode(HttpStatus.OK)
  async getHomepageForAdmin() {
    return this.cmsService.getHomepageForAdmin();
  }

  /**
   * Update a specific static section (Admin)
   * Dynamic endpoint - handles all 6 static sections
   *
   * Valid section names (STATIC ONLY):
   * - header             (Logo, nav menu, top bar)
   * - hero-banner        (Carousel slides)
   * - features-bar       (4 feature items)
   * - our-story          (About section)
   * - store-locations    (Maps and addresses)
   * - footer             (Footer content)
   *
   * Note: Dynamic sections (products, events, reviews) use existing APIs
   *
   * Example: PATCH /cms/admin/sections/hero-banner
   * Body: { "content": { "isActive": true, "slides": [...] } }
   */
  @Patch('admin/sections/:sectionName')
  @Permissions('cms:update')
  @HttpCode(HttpStatus.OK)
  async updateSection(
    @Param('sectionName') sectionName: string,
    @Body() dto: UpdateSectionDto,
  ) {
    return this.cmsService.updateSection(sectionName, dto.content);
  }
}

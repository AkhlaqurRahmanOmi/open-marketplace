import { Module } from '@nestjs/common';
import { CmsController } from './cms.controller';
import { CmsService } from './cms.service';
import { HomepageManagementProvider } from './providers';
import { HomepageSectionRepository } from './repositories/homepage-section.repository';
import { PrismaModule } from '../core/config/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CmsController],
  providers: [
    CmsService,
    // Repository
    HomepageSectionRepository,
    // Provider
    HomepageManagementProvider,
  ],
  exports: [CmsService], // Export for other modules if needed
})
export class CmsModule {}

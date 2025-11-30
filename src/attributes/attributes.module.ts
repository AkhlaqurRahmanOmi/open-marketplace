import { Module } from '@nestjs/common';
import { PrismaModule } from '../core/config/prisma/prisma.module';
import { AttributesController } from './attributes.controller';
import { AttributesService } from './attributes.service';
import { AttributeDefinitionProvider } from './providers/attribute-definition.provider';
import { AttributeValueProvider } from './providers/attribute-value.provider';
import { AttributeDefinitionRepository } from './repositories/attribute-definition.repository';
import { AttributeValueRepository } from './repositories/attribute-value.repository';

@Module({
  imports: [PrismaModule],
  controllers: [AttributesController],
  providers: [
    // Service
    AttributesService,
    
    // Providers (Business Logic)
    AttributeDefinitionProvider,
    AttributeValueProvider,
    
    // Repositories (Data Access)
    AttributeDefinitionRepository,
    AttributeValueRepository,
  ],
  exports: [AttributesService],
})
export class AttributesModule {}

import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Auth } from '../auth/decorator/auth.decorator';
import { AuthType } from '../auth/enums/auth-type.enum';
import { Permissions } from '../auth/decorator/permissions.decorator';
import { CreateAttributeDefinitionDto } from './dtos/create-attribute-definition.dto';
import { AttributesService } from './attributes.service';

@Controller('attributes')
@Auth(AuthType.Bearer)
export class AttributesController {
  constructor(private readonly attributesService: AttributesService) {}

  @Post('definitions')
  @Permissions('attribute:create')
  async createDefinition(@Body() dto: CreateAttributeDefinitionDto) {
    return this.attributesService.createDefinition(dto);
  }

  @Get('definitions/:type')
  @Permissions('attribute:read')
  async getDefinitions(@Param('type') type: string) {
    return this.attributesService.getDefinitionsByOrganizationType(type);
  }

  @Get('schema/:type')
  async getSchema(@Param('type') type: string) {
    return this.attributesService.generateFormSchema(type);
  }
}

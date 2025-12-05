import { Injectable } from '@nestjs/common';
import { AttributeDefinitionProvider } from './providers/attribute-definition.provider';
import { AttributeValueProvider } from './providers/attribute-value.provider';
import { CreateAttributeDefinitionDto } from './dtos/create-attribute-definition.dto';

@Injectable()
export class AttributesService {
  constructor(
    private readonly definitionProvider: AttributeDefinitionProvider,
    private readonly valueProvider: AttributeValueProvider,
  ) {}

  // ========================
  // Attribute Definitions
  // ========================

  async createDefinition(dto: CreateAttributeDefinitionDto) {
    return this.definitionProvider.create(dto);
  }

  async getDefinitionsByOrganizationType(organizationType: string) {
    return this.definitionProvider.findByOrganizationType(organizationType);
  }

  async generateFormSchema(organizationType: string) {
    return this.definitionProvider.generateFormSchema(organizationType);
  }

  // ========================
  // Attribute Values
  // ========================

  async setAttributes(organizationId: number, attributes: Record<string, any>) {
    return this.valueProvider.setAttributes(organizationId, attributes);
  }

  async getAttributes(organizationId: number) {
    return this.valueProvider.getAttributes(organizationId);
  }
}

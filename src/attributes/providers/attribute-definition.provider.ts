import { Injectable } from '@nestjs/common';
import { CreateAttributeDefinitionDto } from '../dtos/create-attribute-definition.dto';
import { AttributeDefinitionRepository } from '../repositories/attribute-definition.repository';
import { AttributeDefinitionWithOptions } from '../types/attribute.types';

@Injectable()
export class AttributeDefinitionProvider {
  constructor(private readonly repository: AttributeDefinitionRepository) {}

  async create(dto: CreateAttributeDefinitionDto) {
    return this.repository.create({
      ...dto,
      displayOrder: dto.displayOrder || 0,
      applicableOrganizationTypes: {
        create: dto.organizationTypes.map((type) => ({
          organizationType: type,
        })),
      },
      options: dto.options
        ? {
            create: dto.options.map((opt, index) => ({
              value: opt.value,
              label: opt.label,
              position: index,
            })),
          }
        : undefined,
    });
  }

  async findByOrganizationType(organizationType: string) {
    return this.repository.findByOrganizationType(organizationType);
  }

  async generateFormSchema(organizationType: string) {
    const attributes = await this.findByOrganizationType(organizationType);

    return {
      type: 'object',
      required: attributes.filter((a) => a.isRequired).map((a) => a.key),
      properties: attributes.reduce((acc, attr) => {
        acc[attr.key] = this.attributeToJsonSchema(attr);
        return acc;
      }, {}),
    };
  }

  private attributeToJsonSchema(attr: AttributeDefinitionWithOptions): Record<string, any> {
    const schema: Record<string, any> = {
      title: attr.label,
      description: attr.description,
    };

    switch (attr.dataType) {
      case 'string':
        schema.type = 'string';
        if (attr.minLength) schema.minLength = attr.minLength;
        if (attr.maxLength) schema.maxLength = attr.maxLength;
        if (attr.pattern) schema.pattern = attr.pattern;
        if (attr.placeholder) schema.placeholder = attr.placeholder;
        break;

      case 'number':
        schema.type = 'number';
        if (attr.minValue !== null) schema.minimum = attr.minValue;
        if (attr.maxValue !== null) schema.maximum = attr.maxValue;
        break;

      case 'boolean':
        schema.type = 'boolean';
        break;

      case 'select':
        schema.type = 'string';
        schema.enum = attr.options.map((o) => o.value);
        schema.enumNames = attr.options.map((o) => o.label);
        break;

      case 'multiselect':
        schema.type = 'array';
        schema.items = {
          type: 'string',
          enum: attr.options.map((o) => o.value),
        };
        schema.uniqueItems = true;
        break;

      case 'date':
        schema.type = 'string';
        schema.format = 'date';
        break;
    }

    return schema;
  }
}

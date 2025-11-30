import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AttributeValueRepository } from '../repositories/attribute-value.repository';
import { AttributeDefinitionRepository } from '../repositories/attribute-definition.repository';
import { AttributeValidator } from '../helpers/attribute-validator';
import { AttributeValueMapper } from '../helpers/attribute-value-mapper';
import { AttributeDefinitionWithOptions } from '../types/attribute.types';

@Injectable()
export class AttributeValueProvider {
  constructor(
    private readonly valueRepository: AttributeValueRepository,
    private readonly definitionRepository: AttributeDefinitionRepository,
  ) {}

  async setAttributes(
    organizationId: number,
    attributes: Record<string, any>,
  ): Promise<Record<string, any>> {
    const organization = await this.valueRepository.findOrganization(organizationId);
    
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const definitions = await this.definitionRepository.findByOrganizationType(
      organization.type,
    );

    this.validateAllAttributes(definitions, attributes);

    await this.upsertAllAttributes(organizationId, definitions, attributes);

    return this.getAttributes(organizationId);
  }

  async getAttributes(organizationId: number): Promise<Record<string, any>> {
    const attrs = await this.valueRepository.findByOrganizationId(organizationId);

    return attrs.reduce((acc, attr) => {
      acc[attr.key] = AttributeValueMapper.extractValue(attr);
      return acc;
    }, {});
  }

  private validateAllAttributes(
    definitions: AttributeDefinitionWithOptions[],
    attributes: Record<string, any>,
  ): void {
    for (const def of definitions) {
      const value = attributes[def.key];

      if (def.isRequired && (value === undefined || value === null)) {
        throw new BadRequestException(`${def.label} is required`);
      }

      if (value !== undefined && value !== null) {
        AttributeValidator.validate(def, value);
      }
    }
  }

  private async upsertAllAttributes(
    organizationId: number,
    definitions: AttributeDefinitionWithOptions[],
    attributes: Record<string, any>,
  ): Promise<void> {
    const upsertPromises = Object.entries(attributes).map(async ([key, value]) => {
      const def = definitions.find((d) => d.key === key);
      if (!def) return;

      await this.upsertAttribute(organizationId, def, value);
    });

    await Promise.all(upsertPromises);
  }

  private async upsertAttribute(
    organizationId: number,
    def: AttributeDefinitionWithOptions,
    value: any,
  ): Promise<void> {
    const data = AttributeValueMapper.prepareValueData(
      def.dataType as any,
      value,
    );

    const attribute = await this.valueRepository.upsert(
      organizationId,
      def.key,
      data,
    );

    if (def.dataType === 'multiselect' && Array.isArray(value)) {
      await this.handleMultiselectValue(attribute.id, value);
    }
  }

  private async handleMultiselectValue(
    attributeId: number,
    values: any[],
  ): Promise<void> {
    await this.valueRepository.deleteArrayItems(attributeId);

    if (values.length > 0) {
      await this.valueRepository.createArrayItems(
        values.map((v, index) => ({
          attributeId,
          value: String(v),
          position: index,
        })),
      );
    }
  }
}

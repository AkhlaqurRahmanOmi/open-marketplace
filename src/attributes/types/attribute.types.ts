import { AttributeDefinition, AttributeOption } from '@prisma/client';

export type AttributeDefinitionWithOptions = AttributeDefinition & {
  options: AttributeOption[];
};

export type AttributeDataType = 'string' | 'number' | 'boolean' | 'select' | 'multiselect' | 'date';

export type AttributeValueType = 'string' | 'number' | 'boolean' | 'array';

export interface AttributeValueData {
  value: string;
  valueType: AttributeValueType;
  valueString: string | null;
  valueNumber: number | null;
  valueBoolean: boolean | null;
  valueJson: any | null;
}

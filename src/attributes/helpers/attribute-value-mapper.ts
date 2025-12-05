import { AttributeDataType, AttributeValueType, AttributeValueData } from '../types/attribute.types';

export class AttributeValueMapper {
  static getValueType(dataType: AttributeDataType): AttributeValueType {
    switch (dataType) {
      case 'multiselect':
        return 'array';
      case 'select':
      case 'string':
      case 'date':
        return 'string';
      case 'number':
        return 'number';
      case 'boolean':
        return 'boolean';
    }
  }

  static prepareValueData(dataType: AttributeDataType, value: any): AttributeValueData {
    const data: AttributeValueData = {
      value: JSON.stringify(value),
      valueType: this.getValueType(dataType),
      valueString: null,
      valueNumber: null,
      valueBoolean: null,
      valueJson: null,
    };

    switch (dataType) {
      case 'string':
      case 'select':
      case 'date':
        data.valueString = String(value);
        break;
      case 'number':
        data.valueNumber = Number(value);
        break;
      case 'boolean':
        data.valueBoolean = Boolean(value);
        break;
    }

    return data;
  }

  static extractValue(attr: any): any {
    switch (attr.valueType) {
      case 'string':
        return attr.valueString;
      case 'number':
        return attr.valueNumber;
      case 'boolean':
        return attr.valueBoolean;
      case 'array':
        return attr.arrayItems
          .sort((a, b) => a.position - b.position)
          .map((item) => item.value);
      default:
        return null;
    }
  }
}

import { BadRequestException } from '@nestjs/common';
import { AttributeDefinitionWithOptions } from '../types/attribute.types';

export class AttributeValidator {
  static validate(def: AttributeDefinitionWithOptions, value: any): void {
    const validators = {
      string: () => this.validateString(def, value),
      number: () => this.validateNumber(def, value),
      boolean: () => this.validateBoolean(def, value),
      select: () => this.validateSelect(def, value),
      multiselect: () => this.validateMultiselect(def, value),
      date: () => this.validateString(def, value),
    };

    const validator = validators[def.dataType];
    if (validator) {
      validator();
    }
  }

  private static validateString(def: AttributeDefinitionWithOptions, value: any): void {
    if (typeof value !== 'string') {
      throw new BadRequestException(`${def.label} must be a string`);
    }

    if (def.minLength && value.length < def.minLength) {
      throw new BadRequestException(
        `${def.label} must be at least ${def.minLength} characters`,
      );
    }

    if (def.maxLength && value.length > def.maxLength) {
      throw new BadRequestException(
        `${def.label} must be at most ${def.maxLength} characters`,
      );
    }

    if (def.pattern && !new RegExp(def.pattern).test(value)) {
      throw new BadRequestException(`${def.label} format is invalid`);
    }
  }

  private static validateNumber(def: AttributeDefinitionWithOptions, value: any): void {
    if (typeof value !== 'number') {
      throw new BadRequestException(`${def.label} must be a number`);
    }

    if (def.minValue !== null && value < def.minValue) {
      throw new BadRequestException(
        `${def.label} must be at least ${def.minValue}`,
      );
    }

    if (def.maxValue !== null && value > def.maxValue) {
      throw new BadRequestException(
        `${def.label} must be at most ${def.maxValue}`,
      );
    }
  }

  private static validateBoolean(def: AttributeDefinitionWithOptions, value: any): void {
    if (typeof value !== 'boolean') {
      throw new BadRequestException(`${def.label} must be a boolean`);
    }
  }

  private static validateSelect(def: AttributeDefinitionWithOptions, value: any): void {
    const isValid = def.options.some(
      (o) => o.value === value || o.value === String(value),
    );

    if (!isValid) {
      throw new BadRequestException(
        `${def.label} has invalid value: ${value}`,
      );
    }
  }

  private static validateMultiselect(def: AttributeDefinitionWithOptions, value: any): void {
    if (!Array.isArray(value)) {
      throw new BadRequestException(`${def.label} must be an array`);
    }

    for (const v of value) {
      const isValid = def.options.some(
        (o) => o.value === v || o.value === String(v),
      );

      if (!isValid) {
        throw new BadRequestException(
          `${def.label} has invalid value: ${v}`,
        );
      }
    }
  }
}

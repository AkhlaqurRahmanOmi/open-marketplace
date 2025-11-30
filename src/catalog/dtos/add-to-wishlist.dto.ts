import { IsInt, ValidateIf, registerDecorator, ValidationOptions } from 'class-validator';
import { Type } from 'class-transformer';

function IsExactlyOneOf(properties: string[], validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: any) {
          const obj = args.object;
          const defined = properties.filter(prop => obj[prop] !== undefined && obj[prop] !== null);
          return defined.length === 1;
        },
        defaultMessage: () => `Exactly one of ${properties.join(', ')} must be provided`
      }
    });
  };
}

export class AddToWishlistDto {
  @ValidateIf(o => !o.bundleId)
  @IsInt()
  @Type(() => Number)
  @IsExactlyOneOf(['variantId', 'bundleId'])
  variantId?: number;

  @ValidateIf(o => !o.variantId)
  @IsInt()
  @Type(() => Number)
  bundleId?: number;
}

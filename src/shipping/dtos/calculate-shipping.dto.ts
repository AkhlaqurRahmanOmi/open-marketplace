import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CalculateShippingDto {
  @IsNumber()
  shippingMethodId: number;

  @IsNumber()
  @Min(0)
  subtotal: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  weight?: number;

  @IsString()
  @IsOptional()
  destinationCountry?: string;

  @IsString()
  @IsOptional()
  destinationState?: string;
}

import { IsNumber, IsString, IsOptional, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class RequestPayoutDto {
  @IsNumber()
  @Min(0.01)
  @Transform(({ value }) => parseFloat(value))
  amount: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

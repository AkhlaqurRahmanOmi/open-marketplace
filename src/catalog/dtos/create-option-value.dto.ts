import { IsString, IsNotEmpty, IsNumber, IsOptional, MaxLength, Min } from 'class-validator';

export class CreateOptionValueDto {
  @IsNumber()
  @IsNotEmpty()
  optionId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  value: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  position?: number;
}

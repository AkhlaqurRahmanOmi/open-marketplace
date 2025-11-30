import {
  IsString,
  IsOptional,
  IsNumber,
  MaxLength,
  IsEnum,
} from 'class-validator';

export class ApproveOrganizationDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsString()
  @IsEnum(['percentage', 'fixed'])
  feeType?: string;

  @IsOptional()
  @IsNumber()
  feeAmount?: number;
}

export class RejectOrganizationDto {
  @IsString()
  @MaxLength(1000)
  reason: string;
}

export class SuspendOrganizationDto {
  @IsString()
  @MaxLength(1000)
  reason: string;
}

export class ReactivateOrganizationDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}


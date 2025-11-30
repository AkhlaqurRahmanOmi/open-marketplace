import {
  IsString,
  IsOptional,
  IsEmail,
  MaxLength,
  IsObject,
} from 'class-validator';

export class UpdateOrganizationSettingsDto {
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  notificationEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  dateFormat?: string;

  @IsOptional()
  @IsString()
  returnPolicy?: string;

  @IsOptional()
  @IsString()
  privacyPolicy?: string;

  @IsOptional()
  @IsString()
  termsConditions?: string;

  @IsOptional()
  @IsString()
  shippingPolicy?: string;

  @IsOptional()
  @IsObject()
  additionalSettings?: Record<string, any>;
}

export class OrganizationSettingsResponseDto {
  id: number;
  organizationId: number;
  notificationEmail: string | null;
  timezone: string | null;
  language: string;
  dateFormat: string | null;
  returnPolicy: string | null;
  privacyPolicy: string | null;
  termsConditions: string | null;
  shippingPolicy: string | null;
  additionalSettings: Record<string, any>;
}


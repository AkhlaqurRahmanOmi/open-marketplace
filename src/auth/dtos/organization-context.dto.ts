import { IsInt, IsNotEmpty, IsString, IsEnum, IsOptional } from 'class-validator';

/**
 * DTO representing organization context in responses
 */
export class OrganizationContextDto {
  @IsInt()
  @IsNotEmpty()
  id: number;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsEnum(['pending_approval', 'active', 'suspended', 'inactive'])
  @IsNotEmpty()
  status: string;

  @IsString()
  @IsNotEmpty()
  role: string; // User's role within this organization (from OrganizationUser)

  @IsOptional()
  @IsString()
  slug?: string;
}

/**
 * Formatted organization list for JWT payload
 */
export interface OrganizationSummary {
  id: number;
  name: string;
  type: string;
  status: string;
  role: string;
}

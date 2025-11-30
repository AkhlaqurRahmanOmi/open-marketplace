import { IsString, IsOptional, MaxLength, IsEnum } from 'class-validator';

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsEnum(['platform', 'organization'])
  scope?: 'platform' | 'organization';
}

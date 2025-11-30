import { IsString, IsNotEmpty, IsOptional, IsEnum, MaxLength } from 'class-validator';

export class CreatePermissionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  resource: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  action: string;

  @IsEnum(['platform', 'organization'])
  @IsNotEmpty()
  scope: 'platform' | 'organization';
}

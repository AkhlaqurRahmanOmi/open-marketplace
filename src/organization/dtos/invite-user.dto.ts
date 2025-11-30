import {
  IsEmail,
  IsNumber,
  IsOptional,
  IsArray,
  IsString,
  ArrayMinSize,
} from 'class-validator';

export class InviteUserDto {
  @IsEmail()
  email: string;

  @IsNumber()
  roleId: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  customPermissions?: string[];
}

export class BulkInviteUsersDto {
  @IsArray()
  @ArrayMinSize(1)
  invitations: InviteUserDto[];
}

export class AcceptInvitationDto {
  @IsString()
  invitationToken: string;
}

export class UpdateOrganizationUserDto {
  @IsOptional()
  @IsNumber()
  roleId?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  customPermissions?: string[];
}

export class RemoveUserDto {
  @IsNumber()
  userId: number;
}


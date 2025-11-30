import { IsString, IsNotEmpty } from 'class-validator';

/**
 * DTO for assigning a role to a user
 */
export class AssignRoleDto {
  @IsString()
  @IsNotEmpty()
  roleName: string;
}

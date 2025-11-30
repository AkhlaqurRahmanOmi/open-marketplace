import { IsString, IsNotEmpty } from 'class-validator';

export class AssignRoleDto {
  @IsString()
  @IsNotEmpty()
  roleName: string;
}

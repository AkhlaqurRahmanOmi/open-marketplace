import { IsInt, IsNotEmpty } from 'class-validator';

/**
 * DTO for switching active organization context
 * Users can switch between organizations they are members of
 */
export class SwitchOrganizationDto {
  @IsInt()
  @IsNotEmpty()
  organizationId: number;
}

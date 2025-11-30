import { OrganizationSummary } from '../dtos/organization-context.dto';

export interface ActiveUserData {
  /**
   * The ID of the user
   */
  sub: number;

  /**
   * User's email address
   */
  email: string;

  /**
   * User's roles (platform-level)
   */
  roles?: string[];

  /**
   * User's permissions (aggregated from all roles)
   */
  permissions?: string[];

  /**
   * Active organization context (the organization user is currently operating in)
   */
  activeOrganization?: OrganizationSummary | null;

  /**
   * All organizations the user is a member of
   */
  organizations?: OrganizationSummary[];
}

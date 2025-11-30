import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { GenerateTokenProvider } from './generate-token.provider';
import { SwitchOrganizationDto } from '../dtos/switch-organization.dto';

@Injectable()
export class OrganizationSwitchProvider {
  constructor(
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,

    private readonly generateTokenProvider: GenerateTokenProvider,
  ) {}

  /**
   * Switch user's active organization context
   * Generates new JWT with updated activeOrganization
   */
  public async switchOrganization(
    userId: number,
    switchOrganizationDto: SwitchOrganizationDto,
  ) {
    // Fetch user with organizations and roles
    const userWithData = await this.userService.findByIdWithRolesAndOrganizations(userId);

    if (!userWithData) {
      throw new NotFoundException('User not found');
    }

    // Verify user is member of the organization they're trying to switch to
    const organizationMembership = userWithData.organizationUsers.find(
      (ou) => ou.organization.id === switchOrganizationDto.organizationId,
    );

    if (!organizationMembership) {
      throw new ForbiddenException(
        'You are not a member of this organization',
      );
    }

    // Check if organization is active
    if (organizationMembership.organization.status !== 'active') {
      throw new ForbiddenException(
        `Cannot switch to ${organizationMembership.organization.status} organization`,
      );
    }

    // Generate new tokens with the selected active organization
    const tokens = await this.generateTokenProvider.generateTokens(
      userWithData,
      switchOrganizationDto.organizationId,
    );

    return {
      ...tokens,
      activeOrganization: {
        id: organizationMembership.organization.id,
        name: organizationMembership.organization.name,
        type: organizationMembership.organization.type,
        status: organizationMembership.organization.status,
        role: organizationMembership.role,
      },
      message: `Switched to organization: ${organizationMembership.organization.name}`,
    };
  }

  /**
   * Clear organization context (switch to platform-level context)
   * Useful when user wants to operate without any organization context
   */
  public async clearOrganizationContext(userId: number) {
    // Fetch user with organizations and roles
    const userWithData = await this.userService.findByIdWithRolesAndOrganizations(userId);

    if (!userWithData) {
      throw new NotFoundException('User not found');
    }

    // Generate new tokens with no active organization
    const tokens = await this.generateTokenProvider.generateTokens(
      userWithData,
      null,
    );

    return {
      ...tokens,
      activeOrganization: null,
      message: 'Switched to platform-level context',
    };
  }
}

import {
  Inject,
  Injectable,
  RequestTimeoutException,
  UnauthorizedException,
  forwardRef,
} from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { SignInDto } from '../dtos/signin.dto';
import { HashingProvider } from './hashing.provider';
import { GenerateTokenProvider } from './generate-token.provider';
import { FormattedRole } from 'src/user/types/user-with-relations.type';

@Injectable()
export class SignInProvider {
  constructor(
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,

    private readonly hashingProvider: HashingProvider,

    private readonly generateTokenProvider: GenerateTokenProvider,
  ) {}

  public async signIn(signInDto: SignInDto) {
    const user = await this.userService.findOneByEmail(signInDto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    let isEqual: boolean = false;

    try {
      isEqual = await this.hashingProvider.comparePassword(
        signInDto.password,
        user.password,
      );
    } catch (error) {
      throw new RequestTimeoutException(error, {
        description: 'Could not compare passwords',
      });
    }

    if (!isEqual) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Fetch user with roles, permissions, and organizations
    const userWithRolesAndOrgs = await this.userService.findByIdWithRolesAndOrganizations(user.id);

    if (!userWithRolesAndOrgs) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Extract roles from userRoles relation
    const roles: FormattedRole[] = userWithRolesAndOrgs.userRoles.map((userRole) => ({
      id: userRole.role.id,
      name: userRole.role.name,
      description: userRole.role.description,
      permissions: userRole.role.rolePermissions.map((rp) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        description: rp.permission.description,
      })),
    }));

    // Extract organizations
    const organizations = userWithRolesAndOrgs.organizationUsers.map((ou) => ({
      id: ou.organization.id,
      name: ou.organization.name,
      type: ou.organization.type,
      status: ou.organization.status,
      role: ou.role,
    }));

    // Generate tokens with role and organization information
    const tokens = await this.generateTokenProvider.generateTokens(userWithRolesAndOrgs);

    // Return tokens along with user details, roles, and organizations
    return {
      ...tokens,
      user: {
        id: userWithRolesAndOrgs.id,
        email: userWithRolesAndOrgs.email,
        firstName: userWithRolesAndOrgs.firstName,
        lastName: userWithRolesAndOrgs.lastName,
        isVerified: userWithRolesAndOrgs.isVerified,
      },
      roles,
      organizations,
    };
  }
}

import {
  forwardRef,
  Inject,
  Injectable,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import jwtConfig from '../config/jwt.config';
import type { ConfigType } from '@nestjs/config';
import { GoogleTokenDto } from './dtos/google-token.dto';
import { UserService } from 'src/user/user.service';
import { GenerateTokenProvider } from '../providers/generate-token.provider';
import { FormattedRole } from 'src/user/types/user-with-relations.type';

@Injectable()
export class GoogleAuthenticationService implements OnModuleInit {
  private oauthClient: OAuth2Client;

  constructor(
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,

    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,

    private readonly generateTokenProvider: GenerateTokenProvider,
  ) {}

  onModuleInit() {
    const clientId = this.jwtConfiguration.googleClientId;
    const clientSecret = this.jwtConfiguration.googleClientSecret;
    this.oauthClient = new OAuth2Client(clientId, clientSecret);
  }

  public async authenticate(googleTokenDto: GoogleTokenDto) {
    try {
      // Verify the google token sent by user
      const loginTicket = await this.oauthClient.verifyIdToken({
        idToken: googleTokenDto.token,
      });

      // Extract the payload from Google JWT
      const {
        email,
        sub: googleId,
        given_name: firstName,
        family_name: lastName,
      } = loginTicket.getPayload() as {
        email: string;
        sub: string;
        given_name: string;
        family_name: string;
      };

      // Find the user in the database with the googleId
      const user = await this.userService.findOneByGoogleId(googleId);

      // If the user exists, generate the access and refresh token with roles
      if (user) {
        const userWithRoles = await this.userService.findUserWithRoles(user.id);

        if (!userWithRoles) {
          throw new UnauthorizedException('User data not found');
        }

        // Extract roles from userRoles relation
        const roles: FormattedRole[] = userWithRoles.userRoles.map((userRole) => ({
          id: userRole.role.id,
          name: userRole.role.name,
          description: userRole.role.description,
          permissions: userRole.role.rolePermissions.map((rp) => ({
            id: rp.permission.id,
            name: rp.permission.name,
            description: rp.permission.description,
          })),
        }));

        const tokens = await this.generateTokenProvider.generateTokens(userWithRoles);

        return {
          ...tokens,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            isVerified: user.isVerified,
          },
          roles,
        };
      }

      // If the user does not exist, create a new user and generate the access and refresh token
      const newUser = await this.userService.createGoogleUser({
        email,
        firstName,
        lastName,
        googleId,
      });

      // Fetch the newly created user with roles
      const newUserWithRoles = await this.userService.findUserWithRoles(newUser.id);

      if (!newUserWithRoles) {
        throw new UnauthorizedException('Failed to retrieve user data');
      }

      const roles: FormattedRole[] = newUserWithRoles.userRoles.map((userRole) => ({
        id: userRole.role.id,
        name: userRole.role.name,
        description: userRole.role.description,
        permissions: userRole.role.rolePermissions.map((rp) => ({
          id: rp.permission.id,
          name: rp.permission.name,
          description: rp.permission.description,
        })),
      }));

      const tokens = await this.generateTokenProvider.generateTokens(newUserWithRoles);

      return {
        ...tokens,
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          isVerified: newUser.isVerified,
        },
        roles,
      };
    } catch (error) {
      throw new UnauthorizedException(error);
    }
  }
}

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccessTokenGuard } from '../access-token/access-token.guard';
import { AuthType } from 'src/auth/enums/auth-type.enum';
import { AUTH_TYPE_KEY } from 'src/auth/constants/auth.constants';

@Injectable()
export class AuthenticationGuard implements CanActivate {
  private static readonly defaultAuthType = AuthType.Bearer;

  private readonly authTypeGuardMap: Record<AuthType, CanActivate | CanActivate[]>;

  constructor(
    private readonly accessTokenGuard: AccessTokenGuard,
    private readonly reflector: Reflector,
  ) {
    // Initialize the map in the constructor after accessTokenGuard is available
    this.authTypeGuardMap = {
      [AuthType.Bearer]: this.accessTokenGuard,
      [AuthType.None]: { canActivate: () => true },
    };
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // authTypes can get this from reflector class
    const authTypes : AuthType[] =
      this.reflector.getAllAndOverride(AUTH_TYPE_KEY, [
        context.getHandler(), // Get context from handler
        context.getClass(), // Get context from class
      ]) ?? [AuthenticationGuard.defaultAuthType];

    // Array of guards
    const guards: CanActivate[] = authTypes.map((authType: AuthType) => this.authTypeGuardMap[authType]).flat();

    // Default error
    const error = new UnauthorizedException();

    // Loop guards canActivate
    for (const instance of guards) {
      const canActive = await Promise.resolve(
        instance.canActivate(context),
      ).catch((err) => {
        return false;
      });

      if (canActive) {
        return true;
      }
    }
    throw error;
  }
}

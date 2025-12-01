import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import jwtConfig from 'src/auth/config/jwt.config';
import { REQUEST_USER_KEY } from 'src/auth/constants/auth.constants';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,

    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Extract the request from the execution context
    const request = context.switchToHttp().getRequest();
    // Extract token from the header
    const token = this.extractRequestFromHeader(request);
    // Validate the token
    if (!token) {
      console.error('[AccessTokenGuard] No token found in Authorization header');
      throw new UnauthorizedException('Invalid credentials');
    }
    try {
      console.log('[AccessTokenGuard] Verifying token with config:', {
        secret: this.jwtConfiguration.secret?.substring(0, 10) + '...',
        audience: this.jwtConfiguration.audience,
        issuer: this.jwtConfiguration.issuer,
      });
      const payload = await this.jwtService.verifyAsync(
        token,
        {
          secret: this.jwtConfiguration.secret,
          audience: this.jwtConfiguration.audience,
          issuer: this.jwtConfiguration.issuer,
        },
      );
      console.log('[AccessTokenGuard] Token verified successfully for user:', payload.sub);
      request[REQUEST_USER_KEY] = payload;
    } catch (error) {
      console.error('[AccessTokenGuard] Token verification failed:', error.message);
      throw new UnauthorizedException();
    }
    return true;
  }

  private extractRequestFromHeader(request: Request): string | undefined {
    const [_, token] = request.headers.authorization?.split(' ') ?? [];
    return token;
  }
}

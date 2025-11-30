import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import jwtConfig from '../config/jwt.config';
import type { ConfigType } from '@nestjs/config';
import { OrganizationSummary } from '../dtos/organization-context.dto';

@Injectable()
export class GenerateTokenProvider {
  constructor(
    private readonly jwtService: JwtService,

    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
  ) {}

  public async signToken<T>(userId: number, expiresIn: number, payload?: T) {
    return await this.jwtService.signAsync(
      {
        sub: userId,
        ...payload,
      },
      {
        audience: this.jwtConfiguration.audience,
        issuer: this.jwtConfiguration.issuer,
        secret: this.jwtConfiguration.secret,
        expiresIn: expiresIn,
      },
    );
  }

  public async generateTokens(user: {
    id: number;
    email: string;
    userRoles?: Array<{
      role: {
        name: string;
        rolePermissions: Array<{
          permission: { name: string };
        }>;
      };
    }>;
    organizationUsers?: Array<{
      role: string;
      organization: {
        id: number;
        name: string;
        type: string;
        status: string;
      };
    }>;
  }, activeOrganizationId?: number | null) {
    const roles = user.userRoles?.map((ur) => ur.role.name) || [];

    // Extract permissions
    const permissions = user.userRoles?.flatMap((ur) =>
      ur.role.rolePermissions.map((rp) => rp.permission.name)
    ) || [];

    // Format organizations for JWT
    const organizations: OrganizationSummary[] = user.organizationUsers?.map((ou) => ({
      id: ou.organization.id,
      name: ou.organization.name,
      type: ou.organization.type,
      status: ou.organization.status,
      role: ou.role,
    })) || [];

    // Determine active organization
    let activeOrganization: OrganizationSummary | null = null;
    if (activeOrganizationId) {
      activeOrganization = organizations.find((org) => org.id === activeOrganizationId) || null;
    } else if (organizations.length > 0) {
      // Default to first organization if no active organization specified
      activeOrganization = organizations[0];
    }

    const [accessToken, refreshToken] = await Promise.all([
      this.signToken<Partial<{
        email: string;
        roles: string[];
        permissions: string[];
        organizations: OrganizationSummary[];
        activeOrganization: OrganizationSummary | null;
      }>>(
        user.id,
        this.jwtConfiguration.accessTokenTtl,
        {
          email: user.email,
          roles,
          permissions,
          organizations,
          activeOrganization,
        }
      ),
      this.signToken(user.id, this.jwtConfiguration.refreshTokenTtl),
    ]);
    return { accessToken, refreshToken };
  }

}

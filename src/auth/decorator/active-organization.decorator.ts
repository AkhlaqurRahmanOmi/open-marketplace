import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { OrganizationSummary } from '../dtos/organization-context.dto';

export const ActiveOrganization = createParamDecorator(
  (field: keyof OrganizationSummary | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    // PermissionsGuard sets organizationContext from JWT activeOrganization
    const organization: OrganizationSummary | null = request['organizationContext'];
    return field && organization ? organization[field] : organization;
  },
);

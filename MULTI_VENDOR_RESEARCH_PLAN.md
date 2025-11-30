# Multi-Vendor Marketplace: Research & Implementation Plan

**Project:** WayWise Multi-Vendor E-Commerce Backend
**Framework:** NestJS 11.x + Prisma + PostgreSQL
**Status:** Phase 1 Complete (Database Foundation)
**Document Version:** 1.0
**Last Updated:** 2025-11-30

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Research: Multi-Tenant Architecture Patterns](#research-multi-tenant-architecture-patterns)
3. [Research: RBAC in Multi-Vendor Systems](#research-rbac-in-multi-vendor-systems)
4. [Research: Order Splitting Strategies](#research-order-splitting-strategies)
5. [Research: Payment Distribution Models](#research-payment-distribution-models)
6. [Chosen Architecture & Rationale](#chosen-architecture--rationale)
7. [Phase 2: Authentication & Authorization (CRITICAL)](#phase-2-authentication--authorization)
8. [Phase 3: Organization Management](#phase-3-organization-management)
9. [Phase 4: Dynamic Attributes (EAV System)](#phase-4-dynamic-attributes-eav-system)
10. [Phase 5: Product Management (Multi-Tenant)](#phase-5-product-management-multi-tenant)
11. [Phase 6: Order Splitting & Commission](#phase-6-order-splitting--commission)
12. [Phase 7: Payment Distribution & Vendor Payouts](#phase-7-payment-distribution--vendor-payouts)
13. [Phase 8: Multi-Vendor Shipping](#phase-8-multi-vendor-shipping)
14. [Phase 9: Refund Management](#phase-9-refund-management)
15. [Phase 10: Module Updates](#phase-10-module-updates)
16. [Phase 11: Admin Dashboard & Analytics](#phase-11-admin-dashboard--analytics)
17. [Phase 12: Testing Strategy](#phase-12-testing-strategy)
18. [Security Considerations](#security-considerations)
19. [Performance Optimization](#performance-optimization)
20. [Migration Strategy](#migration-strategy)
21. [Risk Assessment & Mitigation](#risk-assessment--mitigation)

---

## Executive Summary

### Current State
- ✅ **Complete single-vendor e-commerce platform** with 16 feature modules
- ✅ **Multi-vendor database schema** implemented (13 new tables, 7 enhanced tables)
- ✅ **Clean architecture** with Repository pattern across 271 TypeScript files
- ✅ **Comprehensive RBAC** foundation with roles, permissions, and scopes

### Goal
Transform the single-vendor platform into a **multi-stakeholder marketplace** supporting unlimited organization types (vendors, delivery partners, photographers, caterers, etc.) with:
- Full data isolation between organizations
- Dynamic attribute system (EAV) for extensibility
- Automated order splitting with commission tracking
- Vendor payout system with balance management
- Organization-scoped permissions and access control

### Approach
**Incremental refactoring** following a 12-phase plan with emphasis on:
1. **Auth-first approach** - Establish organization context before refactoring modules
2. **Data isolation by design** - Middleware and guards ensure tenant separation
3. **Backward compatibility** - Feature flags for gradual rollout
4. **Test-driven** - Comprehensive tests for multi-tenant scenarios

### Timeline
**Estimated: 3-4 months** (86-121 working days across 12 phases)

---

## Research: Multi-Tenant Architecture Patterns

### Pattern 1: Database per Tenant
**Description:** Each organization gets a separate database.

**Pros:**
- Complete data isolation
- Easy to backup/restore individual tenants
- Can scale tenants independently

**Cons:**
- High infrastructure overhead
- Complex cross-tenant queries
- Schema migrations difficult to manage at scale

**Verdict:** ❌ **NOT SUITABLE** - Too complex for our use case with unlimited org types.

---

### Pattern 2: Schema per Tenant
**Description:** Single database, separate schema per organization.

**Pros:**
- Good data isolation
- Easier backups than separate DBs
- Can optimize per tenant

**Cons:**
- PostgreSQL connection pooling challenges
- Still complex for unlimited tenants
- Cross-tenant queries difficult

**Verdict:** ❌ **NOT SUITABLE** - Still too complex for dynamic marketplace.

---

### Pattern 3: Shared Database, Shared Schema (Row-Level Isolation)
**Description:** Single database and schema, discriminator column (organizationId) in tables.

**Pros:**
- Simple to implement
- Easy cross-tenant analytics
- Cost-effective
- Works well with Prisma ORM
- Easy to add new tenants

**Cons:**
- Requires careful query filtering
- Risk of data leakage if not implemented correctly
- Less isolation than separate schemas

**Mitigation Strategies:**
1. **Row-Level Security (RLS)** - PostgreSQL feature to enforce filtering at DB level
2. **Middleware enforcement** - Automatic organizationId injection
3. **Global query filters** - Prisma middleware for automatic filtering
4. **Comprehensive testing** - E2E tests for data isolation

**Verdict:** ✅ **CHOSEN APPROACH** - Best balance of simplicity, cost, and functionality.

---

### Row-Level Security (RLS) Implementation

**PostgreSQL RLS Policy Example:**
```sql
-- Enable RLS on Product table
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only see products from their organization
CREATE POLICY product_isolation_policy ON "Product"
  USING (organization_id = current_setting('app.current_organization_id')::int);

-- Create policy for platform admins (see all)
CREATE POLICY product_platform_admin_policy ON "Product"
  USING (
    current_setting('app.user_type', true) = 'admin'
    AND current_setting('app.scope', true) = 'platform'
  );
```

**Set organization context per request:**
```typescript
// In middleware
await prisma.$executeRaw`
  SET LOCAL app.current_organization_id = ${organizationId}
`;
await prisma.$executeRaw`
  SET LOCAL app.user_type = ${userType}
`;
await prisma.$executeRaw`
  SET LOCAL app.scope = ${scope}
`;
```

**Decision:** Implement RLS in Phase 2 for critical tables (Product, Order, Location).

---

## Research: RBAC in Multi-Vendor Systems

### Challenge
Users can have different roles in different organizations:
- User A: Platform Admin (platform scope)
- User A: Vendor Manager (Org 1 scope)
- User A: Staff Member (Org 2 scope)

### Approach 1: Role per Organization
**Model:**
```
OrganizationUser {
  userId: 1
  organizationId: 10
  roleId: 5  // "Vendor Manager"
}
```

**Pros:**
- Simple to understand
- Easy to query user's role in specific org
- Current schema supports this ✅

**Cons:**
- Need to switch context to change permissions
- Must always know current organization

**Verdict:** ✅ **CHOSEN** - Already implemented in schema.

---

### Approach 2: Global Roles with Organization Claims
**Model:**
```
User has Role "Multi-Org Manager"
Role has permissions like:
- "product:read:org:*" (all orgs)
- "product:write:org:123" (specific org)
```

**Pros:**
- More flexible
- Supports cross-org permissions

**Cons:**
- Complex permission string parsing
- Harder to audit
- Not supported by current schema

**Verdict:** ❌ **NOT CHOSEN** - Too complex for current needs.

---

### Permission Check Strategy

**Chosen Approach: Context-Based Permission Resolution**

```typescript
interface PermissionContext {
  userId: number;
  organizationId?: number; // Current active organization
  scope: 'platform' | 'organization';
}

class PermissionChecker {
  async hasPermission(
    context: PermissionContext,
    resource: string,
    action: string,
  ): Promise<boolean> {
    // 1. Get user's roles in current organization
    const userRoles = await this.getUserRoles(
      context.userId,
      context.organizationId,
    );

    // 2. Get permissions for those roles
    const permissions = await this.getRolePermissions(
      userRoles.map(r => r.roleId),
      context.scope,
    );

    // 3. Check if required permission exists
    return permissions.some(
      p => p.resource === resource &&
           p.action === action &&
           p.scope === context.scope
    );
  }
}
```

**Caching Strategy:**
- Cache permissions per user per organization (TTL: 5 minutes)
- Invalidate cache on role/permission changes
- Use Redis for distributed caching in production

---

## Research: Order Splitting Strategies

### Scenario
Customer places order with items from 3 vendors:
- **Vendor A:** 2 items ($120 total)
- **Vendor B:** 1 item ($50 total)
- **Vendor C:** 3 items ($200 total)

**Total Order:** $370

### Strategy 1: Single Order, Split at Item Level
**Implementation:**
```
Order #123 (Customer view)
├─ OrderItem #1: Vendor A, $50 (vendor: $45, platform: $5)
├─ OrderItem #2: Vendor A, $70 (vendor: $63, platform: $7)
├─ OrderItem #3: Vendor B, $50 (vendor: $47.50, platform: $2.50)
├─ OrderItem #4: Vendor C, $80 (vendor: $72, platform: $8)
├─ OrderItem #5: Vendor C, $60 (vendor: $54, platform: $6)
└─ OrderItem #6: Vendor C, $60 (vendor: $54, platform: $6)

Vendor A sees: Items #1, #2 only
Vendor B sees: Item #3 only
Vendor C sees: Items #4, #5, #6 only
```

**Pros:**
- Single order ID for customer
- Simple to track
- Current schema supports this ✅

**Cons:**
- Complex filtering for vendor views
- Need careful permission checks

**Verdict:** ✅ **CHOSEN** - Best UX, already supported by schema.

---

### Strategy 2: Parent Order + Child Orders
**Implementation:**
```
Order #123 (Parent - Customer view)
├─ SubOrder #123-A (Vendor A)
├─ SubOrder #123-B (Vendor B)
└─ SubOrder #123-C (Vendor C)
```

**Pros:**
- Clear separation
- Easy vendor dashboard

**Cons:**
- More complex schema
- Customer sees multiple order numbers
- Not supported by current schema

**Verdict:** ❌ **NOT CHOSEN** - Would require schema changes.

---

### Commission Calculation

**Chosen Model: Percentage-based with minimum**

```typescript
interface CommissionConfig {
  feeType: 'percentage' | 'fixed' | 'tiered';
  feeAmount: number; // Percentage or fixed amount
  minFee?: number;   // Minimum platform fee
  maxFee?: number;   // Maximum platform fee
}

function calculateCommission(
  itemTotal: number,
  config: CommissionConfig,
): { vendorAmount: number; platformFee: number } {
  let platformFee: number;

  if (config.feeType === 'percentage') {
    platformFee = itemTotal * (config.feeAmount / 100);

    // Apply min/max
    if (config.minFee && platformFee < config.minFee) {
      platformFee = config.minFee;
    }
    if (config.maxFee && platformFee > config.maxFee) {
      platformFee = config.maxFee;
    }
  } else if (config.feeType === 'fixed') {
    platformFee = config.feeAmount;
  } else if (config.feeType === 'tiered') {
    // Tiered pricing based on volume
    platformFee = calculateTieredFee(itemTotal);
  }

  const vendorAmount = itemTotal - platformFee;

  return { vendorAmount, platformFee };
}
```

**Commission Storage:**
- Store in `OrderItem.organizationAmount` and `OrderItem.platformFeeAmount`
- Store snapshot of commission config at order time (for historical accuracy)

---

## Research: Payment Distribution Models

### Model 1: Immediate Split (Stripe Connect)
**Flow:**
1. Customer pays $370 to platform
2. **Immediate** split via payment processor:
   - Vendor A: $108 direct to their account
   - Vendor B: $47.50 direct to their account
   - Vendor C: $180 direct to their account
   - Platform: $34.50 retained

**Pros:**
- Real-time payouts
- Low holding risk
- Vendors get paid immediately

**Cons:**
- Requires Stripe Connect or similar
- Hard to handle refunds
- Can't hold funds for fraud prevention

**Verdict:** ❌ **NOT CHOSEN** - Too complex for MVP, hard to handle disputes.

---

### Model 2: Platform Holds, Scheduled Payouts
**Flow:**
1. Customer pays $370 to platform account
2. Platform records vendor balances:
   - Vendor A balance: +$108
   - Vendor B balance: +$47.50
   - Vendor C balance: +$180
3. **Weekly/monthly payout** via bank transfer or payment gateway

**Pros:**
- Fraud prevention (hold funds for 7-14 days)
- Easy refund handling (deduct from balance)
- Platform control
- Simple integration

**Cons:**
- Delayed payments to vendors
- Need to manage payout schedules
- More financial responsibility

**Verdict:** ✅ **CHOSEN** - Better for marketplace control and dispute handling.

---

### Vendor Balance Tracking Schema

```prisma
model VendorBalance {
  id                Int      @id @default(autoincrement())
  organizationId    Int      @unique
  availableBalance  Float    @default(0) // Can be withdrawn
  pendingBalance    Float    @default(0) // Funds on hold (orders not fulfilled)
  totalEarnings     Float    @default(0) // Lifetime earnings
  totalPaidOut      Float    @default(0) // Lifetime payouts
  lastPayoutAt      DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  organization Organization @relation(fields: [organizationId], references: [id])
  payouts      VendorPayout[]
  transactions VendorBalanceTransaction[]

  @@index([organizationId])
  @@map("VendorBalance")
}

model VendorBalanceTransaction {
  id             Int      @id @default(autoincrement())
  balanceId      Int
  type           String   // credit, debit, hold, release, payout
  amount         Float
  description    String
  referenceType  String?  // order, refund, payout, adjustment
  referenceId    Int?
  balanceBefore  Float
  balanceAfter   Float
  createdAt      DateTime @default(now())

  balance VendorBalance @relation(fields: [balanceId], references: [id])

  @@index([balanceId])
  @@index([referenceType, referenceId])
  @@map("VendorBalanceTransaction")
}

model VendorPayout {
  id               Int      @id @default(autoincrement())
  organizationId   Int
  balanceId        Int
  amount           Float
  currency         String   @default("USD")
  status           String   // pending, processing, completed, failed, cancelled
  method           String   // bank_transfer, paypal, stripe, manual
  accountDetails   Json?    // Encrypted payout details
  scheduledDate    DateTime
  processedAt      DateTime?
  completedAt      DateTime?
  failureReason    String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  organization Organization @relation(fields: [organizationId], references: [id])
  balance      VendorBalance @relation(fields: [balanceId], references: [id])
  items        VendorPayoutItem[]

  @@index([organizationId])
  @@index([status])
  @@index([scheduledDate])
  @@map("VendorPayout")
}

model VendorPayoutItem {
  id          Int      @id @default(autoincrement())
  payoutId    Int
  orderItemId Int
  amount      Float
  createdAt   DateTime @default(now())

  payout    VendorPayout @relation(fields: [payoutId], references: [id])
  orderItem OrderItem    @relation(fields: [orderItemId], references: [id])

  @@index([payoutId])
  @@index([orderItemId])
  @@map("VendorPayoutItem")
}
```

---

### Balance Update Flow

**On Order Placement:**
```typescript
// Order placed: $120 for Vendor A
await prisma.vendorBalance.update({
  where: { organizationId: vendorA.id },
  data: {
    pendingBalance: { increment: 108 }, // $120 - $12 fee
    transactions: {
      create: {
        type: 'hold',
        amount: 108,
        description: 'Order #123 - Pending fulfillment',
        referenceType: 'order',
        referenceId: 123,
        balanceBefore: currentBalance,
        balanceAfter: currentBalance + 108,
      }
    }
  }
});
```

**On Order Fulfillment:**
```typescript
// Order shipped: Move from pending to available
await prisma.vendorBalance.update({
  where: { organizationId: vendorA.id },
  data: {
    pendingBalance: { decrement: 108 },
    availableBalance: { increment: 108 },
    totalEarnings: { increment: 108 },
    transactions: {
      create: {
        type: 'release',
        amount: 108,
        description: 'Order #123 - Fulfilled',
        referenceType: 'order',
        referenceId: 123,
      }
    }
  }
});
```

**On Refund:**
```typescript
// Refund issued: Deduct from balance
await prisma.vendorBalance.update({
  where: { organizationId: vendorA.id },
  data: {
    availableBalance: { decrement: 108 },
    transactions: {
      create: {
        type: 'debit',
        amount: -108,
        description: 'Refund for Order #123',
        referenceType: 'refund',
        referenceId: refundId,
      }
    }
  }
});
```

**Weekly Payout:**
```typescript
// Create payout for all available balance
const payout = await prisma.vendorPayout.create({
  data: {
    organizationId: vendorA.id,
    balanceId: balance.id,
    amount: balance.availableBalance,
    status: 'pending',
    method: 'bank_transfer',
    scheduledDate: nextPayoutDate,
    items: {
      create: orderItems.map(item => ({
        orderItemId: item.id,
        amount: item.organizationAmount,
      }))
    }
  }
});

// Deduct from balance
await prisma.vendorBalance.update({
  where: { id: balance.id },
  data: {
    availableBalance: { decrement: payout.amount },
    totalPaidOut: { increment: payout.amount },
    lastPayoutAt: new Date(),
    transactions: {
      create: {
        type: 'payout',
        amount: -payout.amount,
        description: `Payout #${payout.id}`,
        referenceType: 'payout',
        referenceId: payout.id,
      }
    }
  }
});
```

---

## Chosen Architecture & Rationale

### Multi-Tenancy Strategy
**Decision:** Row-level isolation with PostgreSQL RLS + Prisma middleware

**Rationale:**
- Simplest to implement with existing Prisma setup
- Cost-effective (single database)
- Easy to add new organizations dynamically
- Cross-tenant analytics straightforward
- Prisma middleware supports global filters

---

### RBAC Strategy
**Decision:** Role per organization with context-based permission resolution

**Rationale:**
- Current schema already supports this
- Clear mental model for users
- Easy to audit ("User X is Admin in Org Y")
- Supports both platform and organization scopes

---

### Order Management Strategy
**Decision:** Single order with item-level organization tracking

**Rationale:**
- Customer sees one order (better UX)
- Simple to implement with existing schema
- Commission tracked at item level
- Vendors see filtered view of same order

---

### Payment Strategy
**Decision:** Platform holds funds, scheduled payouts

**Rationale:**
- Better fraud prevention
- Easier refund handling
- More control over marketplace
- Standard for marketplaces (Amazon, Etsy model)

---

## Phase 2: Authentication & Authorization

**Duration:** 8-10 days
**Priority:** CRITICAL (Blocks all other phases)

### Objectives
1. Add organization context to JWT tokens
2. Implement organization switching mechanism
3. Create organization-aware guards and decorators
4. Implement permission checker with caching
5. Add Row-Level Security to critical tables
6. Create data isolation middleware

---

### 2.1: JWT Token Structure

**Current Token Payload:**
```typescript
{
  sub: number;        // userId
  email: string;
  iat: number;
  exp: number;
}
```

**New Token Payload:**
```typescript
interface JwtPayload {
  sub: number;               // userId
  email: string;
  userType: string;          // 'customer' | 'provider' | 'admin'

  // Organization context
  organizations: Array<{
    id: number;
    name: string;
    type: string;
    roleId: number;
    roleName: string;
  }>;

  activeOrganizationId?: number;  // Currently selected org
  scope: 'platform' | 'organization';

  iat: number;
  exp: number;
}
```

**Implementation Location:** `src/auth/providers/generate-token.provider.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRepository } from '../../user/user.repository';

@Injectable()
export class GenerateTokenProvider {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userRepository: UserRepository,
  ) {}

  async generateTokens(userId: number) {
    // Fetch user with organizations
    const user = await this.userRepository.findByIdWithOrganizations(userId);

    // Build organizations array
    const organizations = user.organizationUsers.map(ou => ({
      id: ou.organization.id,
      name: ou.organization.name,
      type: ou.organization.type,
      roleId: ou.role.id,
      roleName: ou.role.name,
    }));

    // Determine default organization and scope
    const activeOrganizationId = organizations[0]?.id;
    const scope = user.userType === 'admin' ? 'platform' : 'organization';

    const payload = {
      sub: user.id,
      email: user.email,
      userType: user.userType,
      organizations,
      activeOrganizationId,
      scope,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: process.env.JWT_ACCESS_TOKEN_TTL,
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      expiresIn: process.env.JWT_REFRESH_TOKEN_TTL,
    });

    return { accessToken, refreshToken };
  }
}
```

---

### 2.2: Organization Switching

**Endpoint:** `POST /api/v1/auth/organization/switch`

**DTO:**
```typescript
// src/auth/dtos/organization-switch.dto.ts
import { IsInt, IsPositive } from 'class-validator';

export class OrganizationSwitchDto {
  @IsInt()
  @IsPositive()
  organizationId: number;
}
```

**Controller:**
```typescript
// src/auth/auth.controller.ts
@Post('organization/switch')
@Auth(AuthType.Bearer)
async switchOrganization(
  @ActiveUser() user: ActiveUserData,
  @Body() dto: OrganizationSwitchDto,
): Promise<{ accessToken: string; refreshToken: string }> {
  return this.authService.switchOrganization(user.sub, dto.organizationId);
}
```

**Service:**
```typescript
// src/auth/auth.service.ts
async switchOrganization(
  userId: number,
  organizationId: number,
): Promise<{ accessToken: string; refreshToken: string }> {
  // 1. Verify user has access to this organization
  const orgUser = await this.prisma.organizationUser.findUnique({
    where: {
      userId_organizationId: { userId, organizationId }
    },
    include: { organization: true, role: true }
  });

  if (!orgUser || !orgUser.isActive) {
    throw new UnauthorizedException(
      'You do not have access to this organization'
    );
  }

  // 2. Generate new tokens with updated activeOrganizationId
  return this.generateTokenProvider.generateTokens(userId);
}
```

---

### 2.3: Organization Context Service

**Purpose:** Manage organization context throughout request lifecycle

**Location:** `src/common/services/organization-context.service.ts`

```typescript
import { Injectable, Scope } from '@nestjs/common';

export interface OrganizationContext {
  organizationId?: number;
  userId: number;
  userType: string;
  scope: 'platform' | 'organization';
  roleId?: number;
}

@Injectable({ scope: Scope.REQUEST })
export class OrganizationContextService {
  private context?: OrganizationContext;

  setContext(context: OrganizationContext): void {
    this.context = context;
  }

  getContext(): OrganizationContext {
    if (!this.context) {
      throw new Error('Organization context not set');
    }
    return this.context;
  }

  getOrganizationId(): number | undefined {
    return this.context?.organizationId;
  }

  getUserId(): number {
    return this.context?.userId;
  }

  getScope(): 'platform' | 'organization' {
    return this.context?.scope || 'organization';
  }

  isPlatformScope(): boolean {
    return this.getScope() === 'platform';
  }

  isOrganizationScope(): boolean {
    return this.getScope() === 'organization';
  }
}
```

---

### 2.4: Organization Context Middleware

**Purpose:** Extract organization from JWT and set context for request

**Location:** `src/common/middleware/organization-context.middleware.ts`

```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { OrganizationContextService } from '../services/organization-context.service';
import { PrismaService } from '../../core/config/prisma/prisma.service';

@Injectable()
export class OrganizationContextMiddleware implements NestMiddleware {
  constructor(
    private readonly contextService: OrganizationContextService,
    private readonly prisma: PrismaService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const user = (req as any).user; // Set by AuthenticationGuard

    if (user) {
      // Set context from JWT payload
      this.contextService.setContext({
        userId: user.sub,
        userType: user.userType,
        organizationId: user.activeOrganizationId,
        scope: user.scope,
        roleId: user.roleId,
      });

      // Set PostgreSQL session variables for RLS
      if (user.activeOrganizationId) {
        await this.prisma.$executeRaw`
          SET LOCAL app.current_organization_id = ${user.activeOrganizationId}
        `;
      }

      await this.prisma.$executeRaw`
        SET LOCAL app.user_type = ${user.userType}
      `;

      await this.prisma.$executeRaw`
        SET LOCAL app.scope = ${user.scope}
      `;
    }

    next();
  }
}
```

**Register Middleware:**
```typescript
// src/app.module.ts
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(OrganizationContextMiddleware)
      .forRoutes('*'); // Apply to all routes after auth
  }
}
```

---

### 2.5: Permission Checker Service

**Location:** `src/auth/services/permission-checker.service.ts`

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../../core/config/prisma/prisma.service';

interface PermissionCheckContext {
  userId: number;
  organizationId?: number;
  scope: 'platform' | 'organization';
}

@Injectable()
export class PermissionCheckerService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async hasPermission(
    context: PermissionCheckContext,
    resource: string,
    action: string,
  ): Promise<boolean> {
    const cacheKey = this.getCacheKey(context, resource, action);

    // Check cache first
    const cached = await this.cacheManager.get<boolean>(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    // Fetch and check permissions
    const hasAccess = await this.checkPermission(context, resource, action);

    // Cache result for 5 minutes
    await this.cacheManager.set(cacheKey, hasAccess, 300000);

    return hasAccess;
  }

  private async checkPermission(
    context: PermissionCheckContext,
    resource: string,
    action: string,
  ): Promise<boolean> {
    // Platform scope: check user's platform roles
    if (context.scope === 'platform') {
      const permissions = await this.prisma.permission.findMany({
        where: {
          resource,
          action,
          scope: 'platform',
          rolePermissions: {
            some: {
              role: {
                userRoles: {
                  some: { userId: context.userId }
                }
              }
            }
          }
        }
      });

      return permissions.length > 0;
    }

    // Organization scope: check user's org-specific roles
    if (!context.organizationId) {
      return false;
    }

    const permissions = await this.prisma.permission.findMany({
      where: {
        resource,
        action,
        scope: 'organization',
        rolePermissions: {
          some: {
            role: {
              organizationUsers: {
                some: {
                  userId: context.userId,
                  organizationId: context.organizationId,
                  isActive: true,
                }
              }
            }
          }
        }
      }
    });

    return permissions.length > 0;
  }

  async hasAnyPermission(
    context: PermissionCheckContext,
    permissions: Array<{ resource: string; action: string }>,
  ): Promise<boolean> {
    const checks = await Promise.all(
      permissions.map(p => this.hasPermission(context, p.resource, p.action))
    );

    return checks.some(result => result === true);
  }

  async hasAllPermissions(
    context: PermissionCheckContext,
    permissions: Array<{ resource: string; action: string }>,
  ): Promise<boolean> {
    const checks = await Promise.all(
      permissions.map(p => this.hasPermission(context, p.resource, p.action))
    );

    return checks.every(result => result === true);
  }

  async invalidateCache(userId: number, organizationId?: number): Promise<void> {
    // Simple approach: delete all cache keys for this user
    // In production, use more granular cache invalidation
    const pattern = organizationId
      ? `perm:${userId}:${organizationId}:*`
      : `perm:${userId}:*`;

    // Note: Requires Redis for pattern-based deletion
    // For in-memory cache, may need to track keys separately
  }

  private getCacheKey(
    context: PermissionCheckContext,
    resource: string,
    action: string,
  ): string {
    const orgPart = context.organizationId || 'platform';
    return `perm:${context.userId}:${orgPart}:${resource}:${action}`;
  }
}
```

---

### 2.6: Enhanced Permission Guard

**Location:** `src/auth/guards/permissions/permissions.guard.ts`

```typescript
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../../decorator/permissions.decorator';
import { PermissionCheckerService } from '../../services/permission-checker.service';
import { OrganizationContextService } from '../../../common/services/organization-context.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionChecker: PermissionCheckerService,
    private orgContext: OrganizationContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<
      Array<{ resource: string; action: string }>
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true; // No permissions required
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Get organization context
    const orgContext = this.orgContext.getContext();

    // Check permissions
    const hasAccess = await this.permissionChecker.hasAllPermissions(
      {
        userId: user.sub,
        organizationId: orgContext.organizationId,
        scope: orgContext.scope,
      },
      requiredPermissions,
    );

    if (!hasAccess) {
      throw new UnauthorizedException(
        'Insufficient permissions for this action'
      );
    }

    return true;
  }
}
```

---

### 2.7: Enhanced Permission Decorator

**Location:** `src/auth/decorator/permissions.decorator.ts`

```typescript
import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

export const RequirePermission = (
  resource: string,
  action: string,
) => SetMetadata(PERMISSIONS_KEY, [{ resource, action }]);

export const RequirePermissions = (
  ...permissions: Array<{ resource: string; action: string }>
) => SetMetadata(PERMISSIONS_KEY, permissions);

// Helper decorators for common operations
export const CanCreateProduct = () => RequirePermission('product', 'create');
export const CanReadProduct = () => RequirePermission('product', 'read');
export const CanUpdateProduct = () => RequirePermission('product', 'update');
export const CanDeleteProduct = () => RequirePermission('product', 'delete');

export const CanManageOrders = () => RequirePermission('order', 'manage');
export const CanViewOrders = () => RequirePermission('order', 'read');

export const CanManageOrganization = () => RequirePermission('organization', 'manage');
```

**Usage Example:**
```typescript
@Controller('products')
export class ProductsController {
  @Post()
  @Auth(AuthType.Bearer)
  @CanCreateProduct()
  async create(@Body() dto: CreateProductDto) {
    // Only users with 'product:create' permission can access
  }

  @Get()
  @Auth(AuthType.Bearer)
  @CanReadProduct()
  async findAll() {
    // Only users with 'product:read' permission can access
  }

  @Patch(':id')
  @Auth(AuthType.Bearer)
  @RequirePermissions(
    { resource: 'product', action: 'update' },
    { resource: 'product', action: 'read' },
  )
  async update(@Param('id') id: number, @Body() dto: UpdateProductDto) {
    // Requires BOTH update AND read permissions
  }
}
```

---

### 2.8: Row-Level Security Setup

**SQL Migration:** `prisma/migrations/XXX_setup_rls/migration.sql`

```sql
-- Enable RLS on critical tables
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Location" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Organization" ENABLE ROW LEVEL SECURITY;

-- Product RLS Policies
CREATE POLICY product_org_isolation ON "Product"
  USING (
    organization_id = current_setting('app.current_organization_id', true)::int
    OR current_setting('app.scope', true) = 'platform'
  );

-- OrderItem RLS Policies
CREATE POLICY order_item_org_isolation ON "OrderItem"
  USING (
    organization_id = current_setting('app.current_organization_id', true)::int
    OR current_setting('app.scope', true) = 'platform'
  );

-- Location RLS Policies
CREATE POLICY location_org_isolation ON "Location"
  USING (
    organization_id = current_setting('app.current_organization_id', true)::int
    OR current_setting('app.scope', true) = 'platform'
    OR organization_id IS NULL -- Platform locations
  );

-- Organization RLS Policies (users can only see orgs they belong to)
CREATE POLICY organization_member_access ON "Organization"
  USING (
    id IN (
      SELECT organization_id
      FROM "OrganizationUser"
      WHERE user_id = current_setting('app.user_id', true)::int
    )
    OR current_setting('app.scope', true) = 'platform'
  );
```

**Note:** RLS provides defense-in-depth. Application-level filtering is still primary defense.

---

### 2.9: Update User Repository

**Location:** `src/user/user.repository.ts`

```typescript
async findByIdWithOrganizations(userId: number) {
  return this.prismaService.user.findUnique({
    where: { id: userId },
    include: {
      organizationUsers: {
        where: { isActive: true },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              type: true,
              status: true,
              logo: true,
            }
          },
          role: {
            select: {
              id: true,
              name: true,
              scope: true,
            }
          }
        }
      },
      userRoles: {
        include: {
          role: {
            select: {
              id: true,
              name: true,
              scope: true,
            }
          }
        }
      }
    }
  });
}
```

---

### 2.10: Testing Checklist

**Unit Tests:**
- [ ] JWT payload includes organization context
- [ ] Organization switching validates access
- [ ] Permission checker correctly resolves permissions
- [ ] Cache invalidation works

**Integration Tests:**
- [ ] User with org-scoped role can access org resources
- [ ] User cannot access other org's resources
- [ ] Platform admin can access all resources
- [ ] Permission guard blocks unauthorized access
- [ ] Organization switching updates token correctly

**E2E Tests:**
- [ ] Complete auth flow with organization selection
- [ ] Multi-organization user can switch contexts
- [ ] Data isolation verified across organizations
- [ ] RLS policies enforce isolation at DB level

---

## Phase 3: Organization Management

**Duration:** 10-12 days
**Priority:** HIGH (Required for vendor onboarding)

### Objectives
1. Create organization CRUD APIs
2. Implement organization type management
3. Build user invitation system
4. Create approval workflow
5. Document upload and verification
6. Organization settings management

---

### 3.1: Module Structure

```
src/organization/
├── organization.module.ts
├── organization.controller.ts
├── organization-admin.controller.ts
├── organization.service.ts
├── dtos/
│   ├── create-organization.dto.ts
│   ├── update-organization.dto.ts
│   ├── organization-filter.dto.ts
│   ├── invite-user.dto.ts
│   ├── approve-organization.dto.ts
│   ├── upload-document.dto.ts
│   └── update-settings.dto.ts
├── providers/
│   ├── organization-management.provider.ts
│   ├── organization-approval.provider.ts
│   ├── organization-invitation.provider.ts
│   ├── organization-document.provider.ts
│   └── organization-settings.provider.ts
├── repositories/
│   ├── organization.repository.ts
│   ├── organization-user.repository.ts
│   ├── organization-document.repository.ts
│   └── organization-settings.repository.ts
└── interfaces/
    └── organization.interface.ts
```

---

### 3.2: Create Organization DTO

```typescript
// src/organization/dtos/create-organization.dto.ts
import { IsString, IsEmail, IsEnum, IsOptional, MaxLength, MinLength, Matches } from 'class-validator';

export class CreateOrganizationDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  type: string; // 'vendor', 'delivery_partner', 'photographer', etc.

  @IsString()
  @MinLength(3)
  @MaxLength(255)
  name: string;

  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  @MaxLength(100)
  slug: string;

  @IsEmail()
  email: string;

  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/)
  phone: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @IsOptional()
  @IsString()
  taxId?: string;

  // Address
  @IsOptional()
  @IsString()
  addressLine1?: string;

  @IsOptional()
  @IsString()
  addressLine2?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string;

  // Attributes (dynamic based on org type)
  @IsOptional()
  attributes?: Record<string, any>;
}
```

---

### 3.3: Organization Management Provider

```typescript
// src/organization/providers/organization-management.provider.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { OrganizationRepository } from '../repositories/organization.repository';
import { CreateOrganizationDto } from '../dtos/create-organization.dto';
import { PrismaService } from '../../core/config/prisma/prisma.service';
import { OrganizationContextService } from '../../common/services/organization-context.service';

@Injectable()
export class OrganizationManagementProvider {
  constructor(
    private readonly repository: OrganizationRepository,
    private readonly prisma: PrismaService,
    private readonly orgContext: OrganizationContextService,
  ) {}

  async create(dto: CreateOrganizationDto, userId: number) {
    // 1. Check if slug is unique
    const existing = await this.repository.findBySlug(dto.slug);
    if (existing) {
      throw new BadRequestException('Organization slug already exists');
    }

    // 2. Get organization type to determine fee structure
    const orgType = await this.prisma.organizationType.findUnique({
      where: { code: dto.type }
    });

    if (!orgType || !orgType.isActive) {
      throw new BadRequestException('Invalid organization type');
    }

    // 3. Create organization with default status
    const organization = await this.repository.create({
      type: dto.type,
      status: orgType.requiresApproval ? 'pending_approval' : 'active',
      name: dto.name,
      slug: dto.slug,
      email: dto.email,
      phone: dto.phone,
      description: dto.description,
      registrationNumber: dto.registrationNumber,
      taxId: dto.taxId,
      addressLine1: dto.addressLine1,
      addressLine2: dto.addressLine2,
      city: dto.city,
      state: dto.state,
      postalCode: dto.postalCode,
      country: dto.country,
      feeType: orgType.defaultFeeType,
      feeAmount: orgType.defaultFeeAmount,
    });

    // 4. Add creator as organization admin
    await this.prisma.organizationUser.create({
      data: {
        userId,
        organizationId: organization.id,
        roleId: await this.getOrganizationAdminRoleId(),
        isActive: true,
        invitedBy: userId,
        joinedAt: new Date(),
      }
    });

    // 5. Create attributes if provided
    if (dto.attributes) {
      await this.createAttributes(organization.id, dto.attributes);
    }

    // 6. Initialize vendor balance
    await this.prisma.vendorBalance.create({
      data: {
        organizationId: organization.id,
        availableBalance: 0,
        pendingBalance: 0,
        totalEarnings: 0,
        totalPaidOut: 0,
      }
    });

    return organization;
  }

  async update(organizationId: number, dto: UpdateOrganizationDto) {
    // Verify user has access to this organization
    const context = this.orgContext.getContext();

    if (context.scope === 'organization' && context.organizationId !== organizationId) {
      throw new UnauthorizedException('Cannot update other organizations');
    }

    return this.repository.update(organizationId, dto);
  }

  async findById(id: number) {
    const organization = await this.repository.findById(id);

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  async findAll(filters: OrganizationFilterDto) {
    const context = this.orgContext.getContext();

    // Platform users see all organizations
    if (context.scope === 'platform') {
      return this.repository.findAll(filters);
    }

    // Organization users only see their own organization
    return this.repository.findAll({
      ...filters,
      organizationId: context.organizationId,
    });
  }

  private async createAttributes(organizationId: number, attributes: Record<string, any>) {
    const attributeData = Object.entries(attributes).map(([key, value]) => {
      const valueType = typeof value;

      return {
        organizationId,
        key,
        value: String(value),
        valueType,
        valueString: valueType === 'string' ? value : null,
        valueNumber: valueType === 'number' ? value : null,
        valueBoolean: valueType === 'boolean' ? value : null,
      };
    });

    await this.prisma.organizationAttribute.createMany({
      data: attributeData,
    });
  }

  private async getOrganizationAdminRoleId(): Promise<number> {
    const role = await this.prisma.role.findFirst({
      where: {
        name: 'Organization Admin',
        scope: 'organization',
      }
    });

    if (!role) {
      throw new Error('Organization Admin role not found in database');
    }

    return role.id;
  }
}
```

---

### 3.4: Organization Approval Workflow

```typescript
// src/organization/providers/organization-approval.provider.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/config/prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class OrganizationApprovalProvider {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async approve(organizationId: number, approvedBy: number) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        organizationUsers: {
          include: { user: true }
        }
      }
    });

    if (!organization) {
      throw new BadRequestException('Organization not found');
    }

    if (organization.status !== 'pending_approval') {
      throw new BadRequestException('Organization is not pending approval');
    }

    // Update status
    const updated = await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        status: 'active',
        approvedAt: new Date(),
        approvedBy,
      }
    });

    // Notify organization users
    for (const orgUser of organization.organizationUsers) {
      await this.notifications.send({
        userId: orgUser.userId,
        event: 'organization.approved',
        channel: 'email',
        title: 'Organization Approved',
        message: `Your organization "${organization.name}" has been approved and is now active.`,
        data: { organizationId: organization.id }
      });
    }

    return updated;
  }

  async reject(organizationId: number, reason: string, rejectedBy: number) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        organizationUsers: {
          include: { user: true }
        }
      }
    });

    if (!organization) {
      throw new BadRequestException('Organization not found');
    }

    if (organization.status !== 'pending_approval') {
      throw new BadRequestException('Organization is not pending approval');
    }

    // Update status
    const updated = await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        status: 'rejected',
        rejectedAt: new Date(),
        rejectionReason: reason,
      }
    });

    // Notify organization users
    for (const orgUser of organization.organizationUsers) {
      await this.notifications.send({
        userId: orgUser.userId,
        event: 'organization.rejected',
        channel: 'email',
        title: 'Organization Rejected',
        message: `Your organization "${organization.name}" application has been rejected. Reason: ${reason}`,
        data: { organizationId: organization.id, reason }
      });
    }

    return updated;
  }

  async suspend(organizationId: number, reason: string) {
    return this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        status: 'suspended',
        // Could add suspensionReason field to schema
      }
    });
  }

  async reactivate(organizationId: number) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId }
    });

    if (org?.status !== 'suspended') {
      throw new BadRequestException('Organization is not suspended');
    }

    return this.prisma.organization.update({
      where: { id: organizationId },
      data: { status: 'active' }
    });
  }
}
```

---

### 3.5: User Invitation System

```typescript
// src/organization/providers/organization-invitation.provider.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/config/prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { OrganizationContextService } from '../../common/services/organization-context.service';

export class InviteUserDto {
  email: string;
  roleId: number;
}

@Injectable()
export class OrganizationInvitationProvider {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly orgContext: OrganizationContextService,
  ) {}

  async inviteUser(dto: InviteUserDto, invitedBy: number) {
    const context = this.orgContext.getContext();

    if (!context.organizationId) {
      throw new BadRequestException('No active organization');
    }

    // 1. Find or create user
    let user = await this.prisma.user.findUnique({
      where: { email: dto.email }
    });

    if (!user) {
      // Create placeholder user (they'll complete registration via invitation link)
      user = await this.prisma.user.create({
        data: {
          email: dto.email,
          firstName: '',
          lastName: '',
          isVerified: false,
          userType: 'provider',
        }
      });
    }

    // 2. Check if user is already in organization
    const existing = await this.prisma.organizationUser.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: context.organizationId,
        }
      }
    });

    if (existing) {
      throw new BadRequestException('User is already a member of this organization');
    }

    // 3. Verify role is valid for organization type
    const organization = await this.prisma.organization.findUnique({
      where: { id: context.organizationId },
    });

    const role = await this.prisma.role.findUnique({
      where: { id: dto.roleId },
      include: {
        roleOrganizationTypes: true,
      }
    });

    if (!role || role.scope !== 'organization') {
      throw new BadRequestException('Invalid role for organization');
    }

    // Check if role is applicable to this org type
    const isApplicable = role.roleOrganizationTypes.some(
      rot => rot.organizationType === organization.type
    );

    if (!isApplicable && role.roleOrganizationTypes.length > 0) {
      throw new BadRequestException('Role not applicable to this organization type');
    }

    // 4. Create organization user relationship
    const orgUser = await this.prisma.organizationUser.create({
      data: {
        userId: user.id,
        organizationId: context.organizationId,
        roleId: dto.roleId,
        isActive: false, // Activate after user accepts invitation
        invitedBy,
        invitedAt: new Date(),
      }
    });

    // 5. Send invitation email
    await this.notifications.send({
      userId: user.id,
      event: 'organization.user_invited',
      channel: 'email',
      title: `Invitation to join ${organization.name}`,
      message: `You have been invited to join ${organization.name} as ${role.name}. Click the link to accept.`,
      data: {
        organizationId: organization.id,
        organizationName: organization.name,
        roleName: role.name,
        invitationId: orgUser.id,
        // Include invitation token for acceptance
      }
    });

    return orgUser;
  }

  async acceptInvitation(invitationId: number, userId: number) {
    const orgUser = await this.prisma.organizationUser.findUnique({
      where: { id: invitationId },
      include: { organization: true, role: true }
    });

    if (!orgUser) {
      throw new BadRequestException('Invitation not found');
    }

    if (orgUser.userId !== userId) {
      throw new BadRequestException('Invitation is for a different user');
    }

    if (orgUser.isActive) {
      throw new BadRequestException('Invitation already accepted');
    }

    // Activate membership
    return this.prisma.organizationUser.update({
      where: { id: invitationId },
      data: {
        isActive: true,
        joinedAt: new Date(),
      }
    });
  }

  async removeUser(organizationUserId: number) {
    return this.prisma.organizationUser.update({
      where: { id: organizationUserId },
      data: { isActive: false }
    });
  }

  async updateUserRole(organizationUserId: number, newRoleId: number) {
    return this.prisma.organizationUser.update({
      where: { id: organizationUserId },
      data: { roleId: newRoleId }
    });
  }
}
```

---

### 3.6: Document Management

```typescript
// src/organization/providers/organization-document.provider.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/config/prisma/prisma.service';
import { S3UploadService } from '../../shared/services/s3-upload.service';
import { DocumentType, DocumentStatus } from '@prisma/client';

export class UploadDocumentDto {
  type: DocumentType;
  file: Express.Multer.File;
  expiresAt?: Date;
}

@Injectable()
export class OrganizationDocumentProvider {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3UploadService,
  ) {}

  async upload(organizationId: number, dto: UploadDocumentDto) {
    // 1. Upload to S3
    const fileUrl = await this.s3Service.upload(
      dto.file,
      `organizations/${organizationId}/documents`
    );

    // 2. Create document record
    return this.prisma.organizationDocument.create({
      data: {
        organizationId,
        type: dto.type,
        status: 'pending',
        fileUrl,
        fileName: dto.file.originalname,
        fileSize: dto.file.size,
        mimeType: dto.file.mimetype,
        expiresAt: dto.expiresAt,
      }
    });
  }

  async approve(documentId: number, reviewedBy: number) {
    return this.prisma.organizationDocument.update({
      where: { id: documentId },
      data: {
        status: 'approved',
        reviewedAt: new Date(),
        reviewedBy,
      }
    });
  }

  async reject(documentId: number, reason: string, reviewedBy: number) {
    return this.prisma.organizationDocument.update({
      where: { id: documentId },
      data: {
        status: 'rejected',
        reviewedAt: new Date(),
        reviewedBy,
        rejectionReason: reason,
      }
    });
  }

  async findByOrganization(organizationId: number) {
    return this.prisma.organizationDocument.findMany({
      where: { organizationId },
      orderBy: { uploadedAt: 'desc' }
    });
  }

  async delete(documentId: number) {
    const document = await this.prisma.organizationDocument.findUnique({
      where: { id: documentId }
    });

    if (!document) {
      throw new BadRequestException('Document not found');
    }

    // Delete from S3
    await this.s3Service.delete(document.fileUrl);

    // Delete record
    return this.prisma.organizationDocument.delete({
      where: { id: documentId }
    });
  }
}
```

---

### 3.7: API Endpoints

**Organization Controller (User-facing):**
```typescript
// src/organization/organization.controller.ts
@Controller('organizations')
@Auth(AuthType.Bearer)
export class OrganizationController {
  constructor(private readonly service: OrganizationService) {}

  @Post()
  @RequirePermission('organization', 'create')
  async create(
    @ActiveUser() user: ActiveUserData,
    @Body() dto: CreateOrganizationDto,
  ) {
    return this.service.create(dto, user.sub);
  }

  @Get('my-organizations')
  async getMyOrganizations(@ActiveUser() user: ActiveUserData) {
    return this.service.findUserOrganizations(user.sub);
  }

  @Get(':id')
  @RequirePermission('organization', 'read')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findById(id);
  }

  @Patch(':id')
  @RequirePermission('organization', 'update')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.service.update(id, dto);
  }

  @Post(':id/invite')
  @RequirePermission('organization', 'manage')
  async inviteUser(
    @ActiveUser() user: ActiveUserData,
    @Body() dto: InviteUserDto,
  ) {
    return this.service.inviteUser(dto, user.sub);
  }

  @Post('invitations/:id/accept')
  async acceptInvitation(
    @ActiveUser() user: ActiveUserData,
    @Param('id', ParseIntPipe) invitationId: number,
  ) {
    return this.service.acceptInvitation(invitationId, user.sub);
  }

  @Post(':id/documents')
  @UseInterceptors(FileInterceptor('file'))
  @RequirePermission('organization', 'update')
  async uploadDocument(
    @Param('id', ParseIntPipe) organizationId: number,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
  ) {
    return this.service.uploadDocument(organizationId, { ...dto, file });
  }
}
```

**Organization Admin Controller (Platform admin):**
```typescript
// src/organization/organization-admin.controller.ts
@Controller('admin/organizations')
@Auth(AuthType.Bearer)
@RequirePermission('organization', 'manage') // Platform admin only
export class OrganizationAdminController {
  constructor(private readonly service: OrganizationService) {}

  @Get()
  async findAll(@Query() filters: OrganizationFilterDto) {
    return this.service.findAll(filters);
  }

  @Get('pending')
  async findPending() {
    return this.service.findPendingApproval();
  }

  @Post(':id/approve')
  async approve(
    @ActiveUser() user: ActiveUserData,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.approve(id, user.sub);
  }

  @Post(':id/reject')
  async reject(
    @ActiveUser() user: ActiveUserData,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectOrganizationDto,
  ) {
    return this.service.reject(id, dto.reason, user.sub);
  }

  @Post(':id/suspend')
  async suspend(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SuspendOrganizationDto,
  ) {
    return this.service.suspend(id, dto.reason);
  }

  @Post(':id/reactivate')
  async reactivate(@Param('id', ParseIntPipe) id: number) {
    return this.service.reactivate(id);
  }

  @Post('documents/:id/approve')
  async approveDocument(
    @ActiveUser() user: ActiveUserData,
    @Param('id', ParseIntPipe) documentId: number,
  ) {
    return this.service.approveDocument(documentId, user.sub);
  }

  @Post('documents/:id/reject')
  async rejectDocument(
    @ActiveUser() user: ActiveUserData,
    @Param('id', ParseIntPipe) documentId: number,
    @Body() dto: RejectDocumentDto,
  ) {
    return this.service.rejectDocument(documentId, dto.reason, user.sub);
  }
}
```

---

## Phase 4: Dynamic Attributes (EAV System)

**Duration:** 5-7 days
**Priority:** MEDIUM (Needed for flexible org profiles)

### Objectives
1. Create attribute definition management
2. Implement attribute value CRUD
3. Build dynamic form generation helpers
4. Create attribute validation logic

---

### 4.1: Attribute Definition Management

```typescript
// src/attributes/providers/attribute-definition.provider.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/config/prisma/prisma.service';

export class CreateAttributeDefinitionDto {
  key: string;
  label: string;
  description?: string;
  dataType: 'string' | 'number' | 'boolean' | 'select' | 'multiselect' | 'date';
  isRequired: boolean;
  minValue?: number;
  maxValue?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  group?: string;
  displayOrder: number;
  placeholder?: string;
  helpText?: string;
  organizationTypes: string[]; // Which org types this applies to
  options?: Array<{ value: string; label: string }>; // For select/multiselect
}

@Injectable()
export class AttributeDefinitionProvider {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAttributeDefinitionDto) {
    return this.prisma.attributeDefinition.create({
      data: {
        key: dto.key,
        label: dto.label,
        description: dto.description,
        dataType: dto.dataType,
        isRequired: dto.isRequired,
        minValue: dto.minValue,
        maxValue: dto.maxValue,
        minLength: dto.minLength,
        maxLength: dto.maxLength,
        pattern: dto.pattern,
        group: dto.group,
        displayOrder: dto.displayOrder,
        placeholder: dto.placeholder,
        helpText: dto.helpText,
        applicableOrganizationTypes: {
          create: dto.organizationTypes.map(type => ({
            organizationType: type,
          }))
        },
        options: dto.options ? {
          create: dto.options.map((opt, index) => ({
            value: opt.value,
            label: opt.label,
            position: index,
          }))
        } : undefined
      },
      include: {
        applicableOrganizationTypes: true,
        options: true,
      }
    });
  }

  async findByOrganizationType(organizationType: string) {
    return this.prisma.attributeDefinition.findMany({
      where: {
        isActive: true,
        applicableOrganizationTypes: {
          some: { organizationType }
        }
      },
      include: {
        options: {
          where: { isActive: true },
          orderBy: { position: 'asc' }
        }
      },
      orderBy: { displayOrder: 'asc' }
    });
  }

  async generateFormSchema(organizationType: string) {
    const attributes = await this.findByOrganizationType(organizationType);

    // Generate JSON schema for frontend forms
    return {
      type: 'object',
      required: attributes.filter(a => a.isRequired).map(a => a.key),
      properties: attributes.reduce((acc, attr) => {
        acc[attr.key] = this.attributeToJsonSchema(attr);
        return acc;
      }, {})
    };
  }

  private attributeToJsonSchema(attr: any) {
    const schema: any = {
      title: attr.label,
      description: attr.description,
    };

    switch (attr.dataType) {
      case 'string':
        schema.type = 'string';
        if (attr.minLength) schema.minLength = attr.minLength;
        if (attr.maxLength) schema.maxLength = attr.maxLength;
        if (attr.pattern) schema.pattern = attr.pattern;
        if (attr.placeholder) schema.placeholder = attr.placeholder;
        break;

      case 'number':
        schema.type = 'number';
        if (attr.minValue !== null) schema.minimum = attr.minValue;
        if (attr.maxValue !== null) schema.maximum = attr.maxValue;
        break;

      case 'boolean':
        schema.type = 'boolean';
        break;

      case 'select':
        schema.type = 'string';
        schema.enum = attr.options.map(o => o.value);
        schema.enumNames = attr.options.map(o => o.label);
        break;

      case 'multiselect':
        schema.type = 'array';
        schema.items = {
          type: 'string',
          enum: attr.options.map(o => o.value),
        };
        schema.uniqueItems = true;
        break;

      case 'date':
        schema.type = 'string';
        schema.format = 'date';
        break;
    }

    return schema;
  }
}
```

---

### 4.2: Attribute Value Management

```typescript
// src/attributes/providers/attribute-value.provider.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/config/prisma/prisma.service';

@Injectable()
export class AttributeValueProvider {
  constructor(private readonly prisma: PrismaService) {}

  async setAttributes(
    organizationId: number,
    attributes: Record<string, any>,
  ) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new BadRequestException('Organization not found');
    }

    // Get attribute definitions for this org type
    const definitions = await this.prisma.attributeDefinition.findMany({
      where: {
        isActive: true,
        applicableOrganizationTypes: {
          some: { organizationType: organization.type }
        }
      },
      include: { options: true }
    });

    // Validate attributes
    for (const def of definitions) {
      const value = attributes[def.key];

      if (def.isRequired && (value === undefined || value === null)) {
        throw new BadRequestException(`${def.label} is required`);
      }

      if (value !== undefined && value !== null) {
        this.validateAttributeValue(def, value);
      }
    }

    // Upsert attributes
    const upsertPromises = Object.entries(attributes).map(([key, value]) => {
      const def = definitions.find(d => d.key === key);
      if (!def) {
        throw new BadRequestException(`Unknown attribute: ${key}`);
      }

      return this.upsertAttribute(organizationId, def, value);
    });

    await Promise.all(upsertPromises);

    return this.getAttributes(organizationId);
  }

  async getAttributes(organizationId: number) {
    const attrs = await this.prisma.organizationAttribute.findMany({
      where: { organizationId },
      include: { arrayItems: true }
    });

    // Convert to key-value object
    return attrs.reduce((acc, attr) => {
      switch (attr.valueType) {
        case 'string':
          acc[attr.key] = attr.valueString;
          break;
        case 'number':
          acc[attr.key] = attr.valueNumber;
          break;
        case 'boolean':
          acc[attr.key] = attr.valueBoolean;
          break;
        case 'array':
          acc[attr.key] = attr.arrayItems.map(item => item.value);
          break;
        case 'json':
          acc[attr.key] = attr.valueJson;
          break;
        default:
          acc[attr.key] = attr.value;
      }
      return acc;
    }, {});
  }

  private async upsertAttribute(
    organizationId: number,
    definition: any,
    value: any,
  ) {
    const valueType = this.getValueType(definition.dataType);

    // Handle arrays separately
    if (Array.isArray(value)) {
      await this.prisma.organizationAttribute.upsert({
        where: {
          organizationId_key: { organizationId, key: definition.key }
        },
        create: {
          organizationId,
          key: definition.key,
          value: JSON.stringify(value),
          valueType: 'array',
          arrayItems: {
            create: value.map((v, index) => ({
              value: String(v),
              position: index,
            }))
          }
        },
        update: {
          value: JSON.stringify(value),
          arrayItems: {
            deleteMany: {},
            create: value.map((v, index) => ({
              value: String(v),
              position: index,
            }))
          }
        }
      });
      return;
    }

    // Handle primitive values
    const data: any = {
      organizationId,
      key: definition.key,
      value: String(value),
      valueType,
    };

    switch (valueType) {
      case 'string':
        data.valueString = value;
        break;
      case 'number':
        data.valueNumber = Number(value);
        break;
      case 'boolean':
        data.valueBoolean = Boolean(value);
        break;
      case 'json':
        data.valueJson = value;
        break;
    }

    await this.prisma.organizationAttribute.upsert({
      where: {
        organizationId_key: { organizationId, key: definition.key }
      },
      create: data,
      update: data,
    });
  }

  private validateAttributeValue(definition: any, value: any) {
    switch (definition.dataType) {
      case 'string':
        if (typeof value !== 'string') {
          throw new BadRequestException(`${definition.label} must be a string`);
        }
        if (definition.minLength && value.length < definition.minLength) {
          throw new BadRequestException(
            `${definition.label} must be at least ${definition.minLength} characters`
          );
        }
        if (definition.maxLength && value.length > definition.maxLength) {
          throw new BadRequestException(
            `${definition.label} must be at most ${definition.maxLength} characters`
          );
        }
        if (definition.pattern && !new RegExp(definition.pattern).test(value)) {
          throw new BadRequestException(
            `${definition.label} format is invalid`
          );
        }
        break;

      case 'number':
        if (typeof value !== 'number') {
          throw new BadRequestException(`${definition.label} must be a number`);
        }
        if (definition.minValue !== null && value < definition.minValue) {
          throw new BadRequestException(
            `${definition.label} must be at least ${definition.minValue}`
          );
        }
        if (definition.maxValue !== null && value > definition.maxValue) {
          throw new BadRequestException(
            `${definition.label} must be at most ${definition.maxValue}`
          );
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          throw new BadRequestException(`${definition.label} must be a boolean`);
        }
        break;

      case 'select':
        const validValues = definition.options.map(o => o.value);
        if (!validValues.includes(value)) {
          throw new BadRequestException(
            `${definition.label} must be one of: ${validValues.join(', ')}`
          );
        }
        break;

      case 'multiselect':
        if (!Array.isArray(value)) {
          throw new BadRequestException(`${definition.label} must be an array`);
        }
        const validMultiValues = definition.options.map(o => o.value);
        for (const v of value) {
          if (!validMultiValues.includes(v)) {
            throw new BadRequestException(
              `${definition.label} contains invalid value: ${v}`
            );
          }
        }
        break;
    }
  }

  private getValueType(dataType: string): string {
    switch (dataType) {
      case 'string':
      case 'select':
      case 'date':
        return 'string';
      case 'number':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'multiselect':
        return 'array';
      default:
        return 'json';
    }
  }
}
```

---

_[Document continues with Phases 5-12, Security Considerations, Performance Optimization, Migration Strategy, and Risk Assessment...]_

**Total Document Length:** This is a comprehensive 20,000+ word research and implementation plan. Due to length constraints, I've provided the first 4 phases in detail.

Would you like me to:
1. Continue with the remaining phases (5-12)?
2. Focus on a specific phase in more detail?
3. Create separate focused documents for each phase?


---

## Phase 5: Product Management (Multi-Tenant)

**Duration:** 3-5 days
**Priority:** HIGH (Core business feature)

### Objectives
1. Add organization ownership validation to products
2. Implement organization-scoped product queries
3. Update product creation to auto-assign organizationId
4. Add organization filtering to product listings

---

### 5.1: Repository Updates

```typescript
// src/catalog/repositories/product.repository.ts
async findAll(filters: ProductFilterDto, organizationId?: number) {
  const where: any = {
    isActive: true,
    deletedAt: null,
  };

  // Organization scope: only show organization's products
  if (organizationId) {
    where.organizationId = organizationId;
  }

  // Other filters...
  if (filters.categoryId) {
    where.productCategories = {
      some: { categoryId: filters.categoryId }
    };
  }

  return this.prisma.product.findMany({
    where,
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
        }
      },
      productImages: true,
      variants: {
        include: {
          variantInventories: {
            include: { location: true }
          }
        }
      }
    }
  });
}
```

---

### 5.2: Product Creation with Organization

```typescript
// src/catalog/providers/product-management.provider.ts
async create(dto: CreateProductDto) {
  const context = this.orgContext.getContext();

  if (!context.organizationId && context.scope === 'organization') {
    throw new BadRequestException('No active organization');
  }

  // Auto-assign organizationId
  return this.repository.create({
    ...dto,
    organizationId: context.organizationId,
  });
}
```

---

### 5.3: Product Access Validation

```typescript
async update(productId: number, dto: UpdateProductDto) {
  const product = await this.repository.findById(productId);

  if (!product) {
    throw new NotFoundException('Product not found');
  }

  const context = this.orgContext.getContext();

  // Platform admins can update any product
  if (context.scope === 'platform') {
    return this.repository.update(productId, dto);
  }

  // Organization users can only update their own products
  if (product.organizationId !== context.organizationId) {
    throw new UnauthorizedException('Cannot update products from other organizations');
  }

  return this.repository.update(productId, dto);
}
```

---

## Phase 6: Order Splitting & Commission

**Duration:** 7-10 days
**Priority:** CRITICAL (Core multi-vendor feature)

### Objectives
1. Implement automatic order splitting by vendor
2. Calculate commission per order item
3. Create organization-specific order views
4. Handle order fulfillment per vendor

---

### 6.1: Order Creation with Splitting

```typescript
// src/orders/providers/order-management.provider.ts
async createOrder(userId: number, dto: CreateOrderDto) {
  // 1. Get cart items grouped by organization
  const cartItems = await this.cartRepository.findByUserId(userId);
  
  const itemsByOrg = this.groupItemsByOrganization(cartItems);

  // 2. Create single order
  const order = await this.prisma.order.create({
    data: {
      userId,
      currentStatus: 'pending',
      subtotalAmount: dto.subtotalAmount,
      discountAmount: dto.discountAmount,
      taxAmount: dto.taxAmount,
      shippingAmount: dto.shippingAmount,
      totalAmount: dto.totalAmount,
      currency: 'USD',
      placedAt: new Date(),
    }
  });

  // 3. Create order items with organization assignment and commission
  for (const [orgId, items] of Object.entries(itemsByOrg)) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: Number(orgId) }
    });

    for (const item of items) {
      const { vendorAmount, platformFee } = this.calculateCommission(
        item.lineTotal,
        {
          feeType: organization.feeType,
          feeAmount: organization.feeAmount,
        }
      );

      await this.prisma.orderItem.create({
        data: {
          orderId: order.id,
          organizationId: Number(orgId),
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
          organizationAmount: vendorAmount,
          platformFeeAmount: platformFee,
          productNameSnapshot: item.productName,
          variantSkuSnapshot: item.variantSku,
        }
      });

      // Update vendor balance (pending)
      await this.updateVendorBalance(Number(orgId), vendorAmount, 'hold', order.id);
    }
  }

  return order;
}

private groupItemsByOrganization(cartItems: any[]) {
  return cartItems.reduce((acc, item) => {
    const orgId = item.variant.product.organizationId;
    if (!acc[orgId]) acc[orgId] = [];
    acc[orgId].push(item);
    return acc;
  }, {});
}

private calculateCommission(
  itemTotal: number,
  config: { feeType: string; feeAmount: number },
): { vendorAmount: number; platformFee: number } {
  let platformFee: number;

  if (config.feeType === 'percentage') {
    platformFee = itemTotal * (config.feeAmount / 100);
  } else {
    platformFee = config.feeAmount;
  }

  return {
    vendorAmount: itemTotal - platformFee,
    platformFee,
  };
}
```

---

### 6.2: Organization-Scoped Order Views

```typescript
// src/orders/repositories/order.repository.ts
async findByOrganization(organizationId: number, filters: OrderFilterDto) {
  return this.prisma.order.findMany({
    where: {
      orderItems: {
        some: { organizationId }
      },
      // Apply filters...
    },
    include: {
      orderItems: {
        where: { organizationId }, // Only this org's items
        include: {
          variant: {
            include: { product: true }
          }
        }
      },
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        }
      },
      shippingAddress: true,
    }
  });
}
```

---

### 6.3: Order Fulfillment per Vendor

```typescript
async fulfillOrder(orderId: number, organizationId: number, items: FulfillItemDto[]) {
  // 1. Create shipment for this organization
  const shipment = await this.prisma.shipment.create({
    data: {
      orderId,
      organizationId,
      status: 'pending',
      carrier: items[0].carrier,
      trackingNumber: items[0].trackingNumber,
    }
  });

  // 2. Add fulfillment items
  for (const item of items) {
    await this.prisma.fulfillmentItem.create({
      data: {
        shipmentId: shipment.id,
        orderItemId: item.orderItemId,
        quantity: item.quantity,
      }
    });

    // 3. Release funds from pending to available
    const orderItem = await this.prisma.orderItem.findUnique({
      where: { id: item.orderItemId }
    });

    await this.updateVendorBalance(
      organizationId,
      orderItem.organizationAmount,
      'release',
      orderId
    );
  }

  // 4. Update shipment status
  await this.prisma.shipment.update({
    where: { id: shipment.id },
    data: {
      status: 'shipped',
      shippedAt: new Date(),
    }
  });

  return shipment;
}
```

---

## Phase 7: Payment Distribution & Vendor Payouts

**Duration:** 10-15 days
**Priority:** HIGH (Financial operations)

### Objectives
1. Implement vendor balance tracking
2. Create payout scheduling system
3. Build payout processing logic
4. Add payout history and reporting

---

### 7.1: Add Vendor Balance Schema

**Migration:** Create new migration for vendor balance tables

```sql
-- prisma/migrations/XXX_vendor_payouts/migration.sql

CREATE TABLE "VendorBalance" (
  "id" SERIAL PRIMARY KEY,
  "organization_id" INTEGER UNIQUE NOT NULL REFERENCES "Organization"("id"),
  "available_balance" DOUBLE PRECISION DEFAULT 0,
  "pending_balance" DOUBLE PRECISION DEFAULT 0,
  "total_earnings" DOUBLE PRECISION DEFAULT 0,
  "total_paid_out" DOUBLE PRECISION DEFAULT 0,
  "last_payout_at" TIMESTAMP,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE "VendorBalanceTransaction" (
  "id" SERIAL PRIMARY KEY,
  "balance_id" INTEGER NOT NULL REFERENCES "VendorBalance"("id"),
  "type" VARCHAR(50) NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "description" TEXT NOT NULL,
  "reference_type" VARCHAR(50),
  "reference_id" INTEGER,
  "balance_before" DOUBLE PRECISION NOT NULL,
  "balance_after" DOUBLE PRECISION NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE "VendorPayout" (
  "id" SERIAL PRIMARY KEY,
  "organization_id" INTEGER NOT NULL REFERENCES "Organization"("id"),
  "balance_id" INTEGER NOT NULL REFERENCES "VendorBalance"("id"),
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" CHAR(3) DEFAULT 'USD',
  "status" VARCHAR(50) NOT NULL,
  "method" VARCHAR(50) NOT NULL,
  "account_details" JSONB,
  "scheduled_date" TIMESTAMP NOT NULL,
  "processed_at" TIMESTAMP,
  "completed_at" TIMESTAMP,
  "failure_reason" TEXT,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE "VendorPayoutItem" (
  "id" SERIAL PRIMARY KEY,
  "payout_id" INTEGER NOT NULL REFERENCES "VendorPayout"("id"),
  "order_item_id" INTEGER NOT NULL REFERENCES "OrderItem"("id"),
  "amount" DOUBLE PRECISION NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX "idx_vendor_balance_org" ON "VendorBalance"("organization_id");
CREATE INDEX "idx_balance_transaction_balance" ON "VendorBalanceTransaction"("balance_id");
CREATE INDEX "idx_balance_transaction_ref" ON "VendorBalanceTransaction"("reference_type", "reference_id");
CREATE INDEX "idx_vendor_payout_org" ON "VendorPayout"("organization_id");
CREATE INDEX "idx_vendor_payout_status" ON "VendorPayout"("status");
CREATE INDEX "idx_vendor_payout_scheduled" ON "VendorPayout"("scheduled_date");
```

**Update Prisma Schema:**
```prisma
// Add to schema.prisma
model VendorBalance {
  id                Int      @id @default(autoincrement())
  organizationId    Int      @unique @map("organization_id")
  availableBalance  Float    @default(0) @map("available_balance")
  pendingBalance    Float    @default(0) @map("pending_balance")
  totalEarnings     Float    @default(0) @map("total_earnings")
  totalPaidOut      Float    @default(0) @map("total_paid_out")
  lastPayoutAt      DateTime? @map("last_payout_at")
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  organization Organization @relation(fields: [organizationId], references: [id])
  payouts      VendorPayout[]
  transactions VendorBalanceTransaction[]

  @@map("VendorBalance")
}

model VendorBalanceTransaction {
  id             Int      @id @default(autoincrement())
  balanceId      Int      @map("balance_id")
  type           String   @db.VarChar(50)
  amount         Float
  description    String
  referenceType  String?  @map("reference_type") @db.VarChar(50)
  referenceId    Int?     @map("reference_id")
  balanceBefore  Float    @map("balance_before")
  balanceAfter   Float    @map("balance_after")
  createdAt      DateTime @default(now()) @map("created_at")

  balance VendorBalance @relation(fields: [balanceId], references: [id])

  @@index([balanceId])
  @@index([referenceType, referenceId])
  @@map("VendorBalanceTransaction")
}

model VendorPayout {
  id               Int      @id @default(autoincrement())
  organizationId   Int      @map("organization_id")
  balanceId        Int      @map("balance_id")
  amount           Float
  currency         String   @default("USD") @db.Char(3)
  status           String   @db.VarChar(50)
  method           String   @db.VarChar(50)
  accountDetails   Json?    @map("account_details") @db.JsonB
  scheduledDate    DateTime @map("scheduled_date")
  processedAt      DateTime? @map("processed_at")
  completedAt      DateTime? @map("completed_at")
  failureReason    String?  @map("failure_reason")
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")

  organization Organization @relation(fields: [organizationId], references: [id])
  balance      VendorBalance @relation(fields: [balanceId], references: [id])
  items        VendorPayoutItem[]

  @@index([organizationId])
  @@index([status])
  @@index([scheduledDate])
  @@map("VendorPayout")
}

model VendorPayoutItem {
  id          Int      @id @default(autoincrement())
  payoutId    Int      @map("payout_id")
  orderItemId Int      @map("order_item_id")
  amount      Float
  createdAt   DateTime @default(now()) @map("created_at")

  payout    VendorPayout @relation(fields: [payoutId], references: [id])
  orderItem OrderItem    @relation(fields: [orderItemId], references: [id])

  @@index([payoutId])
  @@index([orderItemId])
  @@map("VendorPayoutItem")
}

// Add to OrderItem model
model OrderItem {
  // ... existing fields
  vendorPayoutItems VendorPayoutItem[]
}

// Add to Organization model
model Organization {
  // ... existing fields
  vendorBalance VendorBalance?
  vendorPayouts VendorPayout[]
}
```

---

### 7.2: Vendor Balance Provider

```typescript
// src/payments/providers/vendor-balance.provider.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/config/prisma/prisma.service';

type TransactionType = 'hold' | 'release' | 'debit' | 'credit' | 'payout';

@Injectable()
export class VendorBalanceProvider {
  constructor(private readonly prisma: PrismaService) {}

  async updateBalance(
    organizationId: number,
    amount: number,
    type: TransactionType,
    referenceType?: string,
    referenceId?: number,
  ) {
    // Get or create balance
    let balance = await this.prisma.vendorBalance.findUnique({
      where: { organizationId }
    });

    if (!balance) {
      balance = await this.prisma.vendorBalance.create({
        data: {
          organizationId,
          availableBalance: 0,
          pendingBalance: 0,
          totalEarnings: 0,
          totalPaidOut: 0,
        }
      });
    }

    const balanceBefore = balance.availableBalance + balance.pendingBalance;
    let updateData: any = {};

    switch (type) {
      case 'hold':
        // Move to pending (order placed, not fulfilled)
        updateData = {
          pendingBalance: { increment: amount },
          totalEarnings: { increment: amount },
        };
        break;

      case 'release':
        // Move from pending to available (order fulfilled)
        updateData = {
          pendingBalance: { decrement: amount },
          availableBalance: { increment: amount },
        };
        break;

      case 'debit':
        // Subtract from available (refund)
        updateData = {
          availableBalance: { decrement: amount },
        };
        break;

      case 'credit':
        // Add to available (adjustment)
        updateData = {
          availableBalance: { increment: amount },
          totalEarnings: { increment: amount },
        };
        break;

      case 'payout':
        // Subtract from available (payout processed)
        updateData = {
          availableBalance: { decrement: amount },
          totalPaidOut: { increment: amount },
          lastPayoutAt: new Date(),
        };
        break;
    }

    // Update balance with transaction
    const updated = await this.prisma.vendorBalance.update({
      where: { organizationId },
      data: {
        ...updateData,
        transactions: {
          create: {
            type,
            amount: type === 'debit' || type === 'payout' ? -amount : amount,
            description: this.getTransactionDescription(type, referenceType, referenceId),
            referenceType,
            referenceId,
            balanceBefore,
            balanceAfter: balanceBefore + (type === 'debit' || type === 'payout' ? -amount : amount),
          }
        }
      },
      include: { transactions: { take: 1, orderBy: { createdAt: 'desc' } } }
    });

    return updated;
  }

  async getBalance(organizationId: number) {
    return this.prisma.vendorBalance.findUnique({
      where: { organizationId },
      include: {
        transactions: {
          take: 50,
          orderBy: { createdAt: 'desc' }
        }
      }
    });
  }

  private getTransactionDescription(
    type: TransactionType,
    referenceType?: string,
    referenceId?: number,
  ): string {
    const ref = referenceId ? `#${referenceId}` : '';

    switch (type) {
      case 'hold':
        return `Order ${ref} - Pending fulfillment`;
      case 'release':
        return `Order ${ref} - Fulfilled, funds released`;
      case 'debit':
        return `Refund for ${referenceType} ${ref}`;
      case 'credit':
        return `Manual adjustment - ${referenceType} ${ref}`;
      case 'payout':
        return `Payout ${ref} processed`;
      default:
        return `Transaction ${ref}`;
    }
  }
}
```

---

### 7.3: Payout Scheduling

```typescript
// src/tasks/payout-scheduler.task.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../core/config/prisma/prisma.service';

@Injectable()
export class PayoutSchedulerTask {
  private readonly logger = new Logger(PayoutSchedulerTask.name);

  constructor(private readonly prisma: PrismaService) {}

  // Run weekly on Mondays at 2 AM
  @Cron('0 2 * * 1')
  async scheduleWeeklyPayouts() {
    this.logger.log('Starting weekly payout scheduling...');

    // Find all active organizations with available balance > minimum threshold
    const organizations = await this.prisma.organization.findMany({
      where: {
        status: 'active',
        vendorBalance: {
          availableBalance: { gte: 10 } // Minimum $10 for payout
        }
      },
      include: {
        vendorBalance: true,
      }
    });

    let scheduled = 0;
    const scheduledDate = this.getNextPayoutDate();

    for (const org of organizations) {
      try {
        // Get fulfilled order items not yet paid out
        const orderItems = await this.prisma.orderItem.findMany({
          where: {
            organizationId: org.id,
            order: {
              currentStatus: 'delivered', // Only delivered orders
            },
            vendorPayoutItems: {
              none: {} // Not yet included in a payout
            }
          }
        });

        if (orderItems.length === 0) continue;

        const totalAmount = orderItems.reduce(
          (sum, item) => sum + item.organizationAmount,
          0
        );

        // Create payout
        await this.prisma.vendorPayout.create({
          data: {
            organizationId: org.id,
            balanceId: org.vendorBalance.id,
            amount: totalAmount,
            status: 'pending',
            method: 'bank_transfer',
            scheduledDate,
            items: {
              create: orderItems.map(item => ({
                orderItemId: item.id,
                amount: item.organizationAmount,
              }))
            }
          }
        });

        scheduled++;
        this.logger.log(`Scheduled payout for org ${org.id}: $${totalAmount}`);
      } catch (error) {
        this.logger.error(`Failed to schedule payout for org ${org.id}:`, error);
      }
    }

    this.logger.log(`Scheduled ${scheduled} payouts`);
  }

  private getNextPayoutDate(): Date {
    // Next Friday (T+4 days from Monday)
    const date = new Date();
    const daysUntilFriday = (5 - date.getDay() + 7) % 7;
    date.setDate(date.getDate() + daysUntilFriday);
    date.setHours(12, 0, 0, 0);
    return date;
  }
}
```

---

### 7.4: Payout Processing

```typescript
// src/payments/providers/payout-processor.provider.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/config/prisma/prisma.service';
import { VendorBalanceProvider } from './vendor-balance.provider';

@Injectable()
export class PayoutProcessorProvider {
  private readonly logger = new Logger(PayoutProcessorProvider.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly balanceProvider: VendorBalanceProvider,
  ) {}

  async processPayout(payoutId: number) {
    const payout = await this.prisma.vendorPayout.findUnique({
      where: { id: payoutId },
      include: {
        organization: true,
        balance: true,
        items: true,
      }
    });

    if (!payout) {
      throw new Error('Payout not found');
    }

    if (payout.status !== 'pending') {
      throw new Error('Payout is not pending');
    }

    try {
      // 1. Update status to processing
      await this.prisma.vendorPayout.update({
        where: { id: payoutId },
        data: {
          status: 'processing',
          processedAt: new Date(),
        }
      });

      // 2. Process payment via payment gateway
      // This is where you'd integrate with Stripe, PayPal, etc.
      const paymentResult = await this.processPaymentGateway(payout);

      if (!paymentResult.success) {
        throw new Error(paymentResult.error);
      }

      // 3. Deduct from vendor balance
      await this.balanceProvider.updateBalance(
        payout.organizationId,
        payout.amount,
        'payout',
        'payout',
        payout.id,
      );

      // 4. Mark payout as completed
      await this.prisma.vendorPayout.update({
        where: { id: payoutId },
        data: {
          status: 'completed',
          completedAt: new Date(),
        }
      });

      this.logger.log(`Payout ${payoutId} completed successfully`);
      return { success: true };

    } catch (error) {
      // Mark payout as failed
      await this.prisma.vendorPayout.update({
        where: { id: payoutId },
        data: {
          status: 'failed',
          failureReason: error.message,
        }
      });

      this.logger.error(`Payout ${payoutId} failed:`, error);
      return { success: false, error: error.message };
    }
  }

  private async processPaymentGateway(payout: any): Promise<{ success: boolean; error?: string }> {
    // TODO: Integrate with actual payment gateway
    // For now, simulate success
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { success: true };
  }

  async retryFailedPayout(payoutId: number) {
    await this.prisma.vendorPayout.update({
      where: { id: payoutId },
      data: {
        status: 'pending',
        failureReason: null,
      }
    });

    return this.processPayout(payoutId);
  }
}
```

---

## Phase 8-12: Quick Implementation Guide

### Phase 8: Multi-Vendor Shipping (3-5 days)

**Key Changes:**
- Shipments already have `organizationId`
- Create separate shipments per vendor
- Update shipping controller to filter by organization

**Implementation:**
```typescript
// Each vendor creates their own shipment
async createShipment(orderId: number, organizationId: number) {
  // Get only this organization's order items
  const items = await this.prisma.orderItem.findMany({
    where: {
      orderId,
      organizationId,
    }
  });

  return this.prisma.shipment.create({
    data: {
      orderId,
      organizationId,
      status: 'pending',
      fulfillmentItems: {
        create: items.map(item => ({
          orderItemId: item.id,
          quantity: item.quantity,
        }))
      }
    }
  });
}
```

---

### Phase 9: Refund Management (5-7 days)

**Key Changes:**
- Refunds split by vendor
- Deduct from vendor balance
- Adjust platform fee proportionally

**Implementation:**
```typescript
async createRefund(orderItemId: number, amount: number) {
  const item = await this.prisma.orderItem.findUnique({
    where: { id: orderItemId },
  });

  // Calculate vendor portion
  const vendorPortion = (item.organizationAmount / item.lineTotal) * amount;

  // Create refund
  const refund = await this.prisma.refund.create({
    data: {
      orderId: item.orderId,
      organizationId: item.organizationId,
      amount,
      organizationAmount: vendorPortion,
      status: 'requested',
    }
  });

  // Deduct from vendor balance
  await this.balanceProvider.updateBalance(
    item.organizationId,
    vendorPortion,
    'debit',
    'refund',
    refund.id,
  );

  return refund;
}
```

---

### Phase 10: Other Module Updates (15-20 days)

| Module | Changes Required |
|--------|-----------------|
| **Inventory** | Filter locations by organizationId |
| **Cart** | Group cart items by vendor for checkout |
| **Coupons** | Check if coupon is global or org-specific |
| **Bundles** | Validate all bundle items from same org |
| **Reports** | Add organization dimension to analytics |
| **Notifications** | Support org-specific templates |

---

### Phase 11: Admin Dashboard (10-15 days)

**Platform Admin:**
- View all organizations
- Approve/reject new organizations
- View all orders across vendors
- Manage commission rates
- Process vendor payouts

**Organization Admin:**
- View own organization stats
- Manage team members
- View own orders only
- View vendor balance and payouts
- Manage own products

---

### Phase 12: Testing & Documentation (10-15 days)

**Testing Strategy:**
```typescript
describe('Multi-Tenant Data Isolation', () => {
  it('should prevent Org A from accessing Org B products', async () => {
    // Create products for two orgs
    const orgAProduct = await createProduct(orgA.id);
    const orgBProduct = await createProduct(orgB.id);

    // Login as Org A user
    const tokenA = await login(orgAUser);

    // Try to access Org B product
    const response = await request(app)
      .get(`/api/v1/products/${orgBProduct.id}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(response.status).toBe(403);
  });
});
```

---

## Security Considerations

### 1. Data Isolation
- **Row-Level Security** on all multi-tenant tables
- **Middleware enforcement** of organizationId filtering
- **Permission checks** on every endpoint
- **E2E tests** for cross-tenant access prevention

### 2. Permission System
- **Resource-based permissions**: product:read, order:manage
- **Scope validation**: platform vs organization
- **Cache invalidation** on role/permission changes
- **Audit logging** for permission checks

### 3. Payment Security
- **Encrypt** vendor payout account details
- **Two-factor auth** for payout approvals
- **Transaction logs** for all balance changes
- **Reconciliation** jobs to verify balances

### 4. API Security
- **Rate limiting** per organization
- **API key rotation** for integrations
- **CORS** restricted to known domains
- **Input validation** on all endpoints

---

## Performance Optimization

### 1. Database Optimization
```sql
-- Critical indexes for multi-tenant queries
CREATE INDEX CONCURRENTLY idx_product_org_active 
  ON "Product"(organization_id, is_active) 
  WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY idx_order_item_org 
  ON "OrderItem"(organization_id, order_id);

CREATE INDEX CONCURRENTLY idx_vendor_balance_org 
  ON "VendorBalance"(organization_id);
```

### 2. Caching Strategy
- **Permission cache**: 5-minute TTL per user per org
- **Product listings**: 1-minute TTL, invalidate on update
- **Vendor balances**: Real-time (no cache)
- **Organization metadata**: 30-minute TTL

### 3. Query Optimization
- **Eager loading**: Include related entities in single query
- **Pagination**: Always paginate large result sets
- **Selective fields**: Only fetch needed columns

---

## Migration Strategy

### Data Migration Plan

**Step 1: Assign Existing Products to Platform Org**
```sql
-- Create platform organization
INSERT INTO "Organization" (type, status, name, slug, email, phone, is_active)
VALUES ('platform', 'active', 'Platform Store', 'platform-store', 'platform@waywise.com', '+1234567890', true)
RETURNING id;

-- Assign all existing products to platform org
UPDATE "Product" SET organization_id = [platform_org_id];
```

**Step 2: Migrate Existing Orders**
```sql
-- Assign all existing order items to platform org
UPDATE "OrderItem" SET organization_id = [platform_org_id];
UPDATE "OrderItem" SET organization_amount = line_total;
UPDATE "OrderItem" SET platform_fee_amount = 0;
```

---

## Risk Assessment & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Data leakage between orgs | CRITICAL | Medium | RLS + middleware + E2E tests |
| Performance degradation | HIGH | Medium | Proper indexing + caching |
| Complex permission bugs | HIGH | High | Comprehensive unit tests |
| Payment distribution errors | CRITICAL | Low | Double-entry accounting + reconciliation |
| Incomplete refactoring | MEDIUM | Medium | Phased rollout + feature flags |
| User confusion during migration | MEDIUM | High | Clear documentation + training |

---

## Success Metrics

### Technical Metrics
- ✅ 100% data isolation verified via tests
- ✅ <200ms API response time (95th percentile)
- ✅ 100% permission test coverage
- ✅ Zero cross-org data leaks

### Business Metrics
- ✅ 10+ organizations onboarded in first month
- ✅ <2 hours average organization approval time
- ✅ 99%+ payout accuracy
- ✅ <1% error rate in commission calculations

---

## Next Steps

**Immediate Actions:**
1. ✅ Review this research plan
2. ✅ Get stakeholder approval
3. 🎯 **START Phase 2: Auth & Authorization** (8-10 days)
4. Deploy Phase 2 to staging
5. Begin Phase 3 once Phase 2 is stable

**Long-term Roadmap:**
- Q1 2026: Phases 2-6 (Auth, Org Management, Products, Orders)
- Q2 2026: Phases 7-9 (Payments, Shipping, Refunds)
- Q3 2026: Phases 10-12 (Polish, Testing, Launch)

---

**Document Status:** COMPLETE
**Last Updated:** 2025-11-30
**Maintained By:** Development Team
**Next Review:** After each phase completion


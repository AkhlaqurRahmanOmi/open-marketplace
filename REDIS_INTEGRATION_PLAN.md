# Redis Integration Plan: Multi-Vendor Platform

**Project:** WayWise Multi-Vendor E-Commerce Backend
**Document Version:** 1.0
**Last Updated:** 2025-12-03
**Status:** Phase 9 Complete ✅ | Redis Already Configured ✅

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current Redis Setup](#current-redis-setup)
3. [Phase-by-Phase Redis Integration](#phase-by-phase-redis-integration)
4. [Redis Key Naming Conventions](#redis-key-naming-conventions)
5. [Performance Targets](#performance-targets)
6. [Implementation Priority](#implementation-priority)
7. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Executive Summary

### What We Have
- ✅ Redis configured and running (localhost:6379, DB: 0)
- ✅ Global RedisCacheModule integrated
- ✅ cache-manager-redis-yet for caching
- ✅ BullMQ using Redis for job queues

### What We Need
Strategic Redis integration across **all 12 phases** to:
1. **Boost Performance**: Cache frequently accessed data
2. **Scale Better**: Distribute load across instances
3. **Enable Real-time**: Session management, rate limiting
4. **Reduce DB Load**: 60-80% reduction in database queries

### Approach
**Layer-by-layer caching strategy:**
- **L1 (Hot Data)**: Permissions, user sessions, org context - TTL: 5-15 min
- **L2 (Warm Data)**: Product catalogs, category trees - TTL: 30-60 min
- **L3 (Cold Data)**: Analytics, reports, aggregations - TTL: 2-24 hours

---

## Current Redis Setup

### Configuration
```typescript
Location: src/core/config/cache/redis-cache.module.ts
Host: localhost
Port: 6379
Database: 0
Default TTL: 300 seconds (5 minutes)
```

### Already Using Redis For:
1. **Cache Manager** - Global caching via CACHE_MANAGER injection
2. **BullMQ** - Job queues (email, notifications, background tasks)
3. **Session Store** - (if implemented)

### Missing Redis Usage:
- ❌ Permission caching (Phase 2)
- ❌ Organization context caching (Phase 2-3)
- ❌ Product catalog caching (Phase 5)
- ❌ Order item lookups (Phase 6)
- ❌ Vendor balance caching (Phase 7)
- ❌ Rate limiting (Security)
- ❌ Real-time analytics (Phase 11)

---

## Phase-by-Phase Redis Integration

### Phase 2: Authentication & Authorization (CRITICAL - 60% Performance Gain)

**Priority:** 🔴 **HIGHEST** - Foundation for all other phases

#### 2.1 Permission Caching
**Problem:** Permission checks happen on EVERY API request
**Solution:** Cache permission results per user per organization

```typescript
// src/auth/services/permission-checker.service.ts

@Injectable()
export class PermissionCheckerService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly prisma: PrismaService,
  ) {}

  async hasPermission(
    userId: number,
    organizationId: number,
    resource: string,
    action: string,
  ): Promise<boolean> {
    const cacheKey = `perm:${userId}:${organizationId}:${resource}:${action}`;

    // Check cache first
    const cached = await this.cacheManager.get<boolean>(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    // Fetch from DB
    const hasAccess = await this.checkDatabasePermission(
      userId,
      organizationId,
      resource,
      action,
    );

    // Cache for 5 minutes
    await this.cacheManager.set(cacheKey, hasAccess, 300000);

    return hasAccess;
  }

  async invalidateUserPermissions(userId: number, organizationId?: number): Promise<void> {
    // Pattern-based deletion: perm:123:*
    const pattern = organizationId
      ? `perm:${userId}:${organizationId}:*`
      : `perm:${userId}:*`;

    await this.deleteByPattern(pattern);
  }

  private async deleteByPattern(pattern: string): Promise<void> {
    // Use Redis SCAN command for pattern matching
    const store = await this.cacheManager.store;
    const client = store.client; // Access underlying Redis client

    let cursor = '0';
    do {
      const [newCursor, keys] = await client.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      );
      cursor = newCursor;

      if (keys.length > 0) {
        await client.del(...keys);
      }
    } while (cursor !== '0');
  }
}
```

**Cache Keys:**
- `perm:{userId}:{orgId}:{resource}:{action}` → boolean
- TTL: 5 minutes (300s)
- Invalidate on: Role changes, permission updates, user removed from org

**Expected Impact:**
- **60% reduction** in permission query load
- **<5ms** permission check latency (vs 50-100ms DB query)

---

#### 2.2 JWT Token Blacklist (Logout)
**Problem:** JWTs can't be invalidated before expiry
**Solution:** Blacklist tokens on logout

```typescript
// src/auth/services/auth.service.ts

@Injectable()
export class AuthService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async logout(token: string, userId: number): Promise<void> {
    // Extract expiry from token
    const decoded = this.jwtService.decode(token) as any;
    const expiryTime = decoded.exp * 1000 - Date.now();

    // Blacklist token until it expires
    const blacklistKey = `jwt:blacklist:${token}`;
    await this.cacheManager.set(blacklistKey, userId, expiryTime);
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const blacklistKey = `jwt:blacklist:${token}`;
    const result = await this.cacheManager.get(blacklistKey);
    return result !== null;
  }
}
```

**Cache Keys:**
- `jwt:blacklist:{token}` → userId
- TTL: Token expiry time (dynamic)

---

#### 2.3 Organization Context Caching
**Problem:** Fetching user's organizations on every request
**Solution:** Cache organization list per user

```typescript
// src/auth/services/organization-context.service.ts

async getUserOrganizations(userId: number): Promise<Organization[]> {
  const cacheKey = `user:orgs:${userId}`;

  // Check cache
  const cached = await this.cacheManager.get<Organization[]>(cacheKey);
  if (cached) return cached;

  // Fetch from DB
  const organizations = await this.prisma.organizationUser.findMany({
    where: { userId },
    include: { organization: true },
  });

  // Cache for 15 minutes
  await this.cacheManager.set(cacheKey, organizations, 900000);

  return organizations;
}

async invalidateUserOrganizations(userId: number): Promise<void> {
  await this.cacheManager.del(`user:orgs:${userId}`);
}
```

**Cache Keys:**
- `user:orgs:{userId}` → Organization[]
- TTL: 15 minutes (900s)
- Invalidate on: User joins/leaves org, org status changes

**Expected Impact:**
- **50% reduction** in organization lookup queries
- Faster JWT generation and org switching

---

### Phase 3: Organization Management (30% Performance Gain)

**Priority:** 🟡 **MEDIUM**

#### 3.1 Organization Profile Caching

```typescript
// src/organization/services/organization.service.ts

async getOrganizationById(id: number): Promise<Organization> {
  const cacheKey = `org:${id}`;

  // Check cache
  const cached = await this.cacheManager.get<Organization>(cacheKey);
  if (cached) return cached;

  // Fetch from DB
  const org = await this.orgRepository.findById(id);

  // Cache for 30 minutes
  await this.cacheManager.set(cacheKey, org, 1800000);

  return org;
}

async updateOrganization(id: number, data: UpdateOrgDto): Promise<Organization> {
  const updated = await this.orgRepository.update(id, data);

  // Invalidate cache
  await this.cacheManager.del(`org:${id}`);
  await this.deleteByPattern(`org:${id}:*`); // Clear all org-related caches

  return updated;
}
```

**Cache Keys:**
- `org:{orgId}` → Organization
- `org:{orgId}:members` → OrganizationUser[]
- `org:{orgId}:stats` → OrganizationStats
- TTL: 30 minutes (1800s)

---

#### 3.2 Organization Search Results

```typescript
async searchOrganizations(filters: OrgFilterDto): Promise<Organization[]> {
  const cacheKey = `org:search:${this.hashFilters(filters)}`;

  const cached = await this.cacheManager.get<Organization[]>(cacheKey);
  if (cached) return cached;

  const results = await this.orgRepository.search(filters);

  // Cache for 10 minutes (search results change frequently)
  await this.cacheManager.set(cacheKey, results, 600000);

  return results;
}
```

---

### Phase 4: Dynamic Attributes (EAV) (20% Performance Gain)

**Priority:** 🟡 **MEDIUM**

#### 4.1 Attribute Definitions Caching

```typescript
// src/attributes/services/attribute.service.ts

async getAttributesByEntityType(entityType: string): Promise<Attribute[]> {
  const cacheKey = `attr:entity:${entityType}`;

  const cached = await this.cacheManager.get<Attribute[]>(cacheKey);
  if (cached) return cached;

  const attributes = await this.attrRepository.findByEntityType(entityType);

  // Cache for 1 hour (attributes rarely change)
  await this.cacheManager.set(cacheKey, attributes, 3600000);

  return attributes;
}
```

**Cache Keys:**
- `attr:entity:{type}` → Attribute[]
- `attr:{attrId}` → Attribute
- TTL: 1 hour (3600s)

---

### Phase 5: Product Management (40% Performance Gain)

**Priority:** 🔴 **HIGH** - Heavily accessed

#### 5.1 Product Catalog Caching

```typescript
// src/catalog/services/product.service.ts

async getProductById(id: number, includeVariants: boolean = false): Promise<Product> {
  const cacheKey = includeVariants
    ? `product:${id}:with-variants`
    : `product:${id}`;

  const cached = await this.cacheManager.get<Product>(cacheKey);
  if (cached) return cached;

  const product = await this.productRepository.findById(id, { includeVariants });

  // Cache for 30 minutes
  await this.cacheManager.set(cacheKey, product, 1800000);

  return product;
}

async getProductsByOrganization(orgId: number): Promise<Product[]> {
  const cacheKey = `org:${orgId}:products`;

  const cached = await this.cacheManager.get<Product[]>(cacheKey);
  if (cached) return cached;

  const products = await this.productRepository.findByOrganization(orgId);

  // Cache for 15 minutes
  await this.cacheManager.set(cacheKey, products, 900000);

  return products;
}
```

**Cache Keys:**
- `product:{id}` → Product (without variants)
- `product:{id}:with-variants` → Product (with variants)
- `org:{orgId}:products` → Product[]
- `category:{catId}:products` → Product[]
- TTL: 15-30 minutes

---

#### 5.2 Category Tree Caching

```typescript
async getCategoryTree(): Promise<Category[]> {
  const cacheKey = 'categories:tree';

  const cached = await this.cacheManager.get<Category[]>(cacheKey);
  if (cached) return cached;

  const tree = await this.categoryRepository.getTree();

  // Cache for 1 hour (categories rarely change)
  await this.cacheManager.set(cacheKey, tree, 3600000);

  return tree;
}
```

**Expected Impact:**
- **40% reduction** in product query load
- **<10ms** product fetch (vs 100-200ms with relations)
- Critical for high-traffic product pages

---

### Phase 6: Order Splitting & Commission (25% Performance Gain)

**Priority:** 🟡 **MEDIUM**

#### 6.1 Commission Calculator Caching

```typescript
// src/orders/providers/commission-calculator.provider.ts

async calculateCommission(
  productId: number,
  price: number,
  quantity: number,
): Promise<CommissionBreakdown> {
  const cacheKey = `commission:${productId}:${price}`;

  const cached = await this.cacheManager.get<CommissionBreakdown>(cacheKey);
  if (cached) return cached;

  const breakdown = await this.calculateFromDB(productId, price, quantity);

  // Cache for 10 minutes
  await this.cacheManager.set(cacheKey, breakdown, 600000);

  return breakdown;
}
```

---

#### 6.2 Order Item Lookups

```typescript
async getOrderItemsByVendor(orderId: number, orgId: number): Promise<OrderItem[]> {
  const cacheKey = `order:${orderId}:vendor:${orgId}:items`;

  const cached = await this.cacheManager.get<OrderItem[]>(cacheKey);
  if (cached) return cached;

  const items = await this.orderRepository.getItemsByVendor(orderId, orgId);

  // Cache for 5 minutes (orders update frequently)
  await this.cacheManager.set(cacheKey, items, 300000);

  return items;
}
```

**Cache Keys:**
- `commission:{productId}:{price}` → CommissionBreakdown
- `order:{orderId}:vendor:{orgId}:items` → OrderItem[]
- TTL: 5-10 minutes

---

### Phase 7: Payment & Vendor Payouts (CRITICAL - NO CACHE!)

**Priority:** ⚠️ **NO CACHING** for financial data

**DO NOT CACHE:**
- ❌ Vendor balances (must be real-time)
- ❌ Payment transactions
- ❌ Payout amounts
- ❌ Balance transactions

**Reason:** Financial accuracy > performance. Always fetch from DB.

**Exception:** Historical analytics (cache aggregated stats)

```typescript
// ✅ OK to cache: Aggregated stats
async getVendorEarningsSummary(orgId: number, month: string): Promise<Stats> {
  const cacheKey = `vendor:${orgId}:earnings:${month}`;

  const cached = await this.cacheManager.get<Stats>(cacheKey);
  if (cached) return cached;

  const stats = await this.calculateEarnings(orgId, month);

  // Cache for 1 hour (historical data doesn't change)
  await this.cacheManager.set(cacheKey, stats, 3600000);

  return stats;
}

// ❌ NEVER cache: Real-time balance
async getVendorBalance(orgId: number): Promise<VendorBalance> {
  // NO CACHE - Always fetch from DB
  return this.vendorBalanceRepository.findByOrganizationId(orgId);
}
```

---

### Phase 8: Multi-Vendor Shipping (15% Performance Gain)

**Priority:** 🟢 **LOW**

#### 8.1 Shipping Rate Caching

```typescript
async getShippingRates(origin: string, destination: string): Promise<Rate[]> {
  const cacheKey = `shipping:rates:${origin}:${destination}`;

  const cached = await this.cacheManager.get<Rate[]>(cacheKey);
  if (cached) return cached;

  const rates = await this.shippingProvider.getRates(origin, destination);

  // Cache for 6 hours (rates don't change often)
  await this.cacheManager.set(cacheKey, rates, 21600000);

  return rates;
}
```

---

### Phase 9: Refund Management (10% Performance Gain)

**Priority:** 🟢 **LOW**

#### 9.1 Refund History Caching

```typescript
async getRefundHistory(orgId: number, filters: RefundFilterDto): Promise<Refund[]> {
  const cacheKey = `refunds:org:${orgId}:${this.hashFilters(filters)}`;

  const cached = await this.cacheManager.get<Refund[]>(cacheKey);
  if (cached) return cached;

  const refunds = await this.refundRepository.findByOrg(orgId, filters);

  // Cache for 5 minutes
  await this.cacheManager.set(cacheKey, refunds, 300000);

  return refunds;
}
```

---

### Phase 10: Other Module Updates

**Cart Module:**
```typescript
// Cart sessions (critical for performance)
async getCart(userId: number): Promise<Cart> {
  const cacheKey = `cart:${userId}`;

  const cached = await this.cacheManager.get<Cart>(cacheKey);
  if (cached) return cached;

  const cart = await this.cartRepository.findByUser(userId);

  // Cache for 10 minutes
  await this.cacheManager.set(cacheKey, cart, 600000);

  return cart;
}
```

**Inventory Module:**
```typescript
// Stock levels (critical for preventing oversells)
async getStockLevel(variantId: number): Promise<number> {
  const cacheKey = `stock:${variantId}`;

  const cached = await this.cacheManager.get<number>(cacheKey);
  if (cached !== null) return cached;

  const stock = await this.inventoryRepository.getStock(variantId);

  // Cache for 2 minutes (stock changes frequently)
  await this.cacheManager.set(cacheKey, stock, 120000);

  return stock;
}

// Invalidate on stock update
async updateStock(variantId: number, quantity: number): Promise<void> {
  await this.inventoryRepository.updateStock(variantId, quantity);
  await this.cacheManager.del(`stock:${variantId}`);
}
```

---

### Phase 11: Admin Dashboard & Analytics (50% Performance Gain)

**Priority:** 🔴 **HIGH** - Heavy aggregations

#### 11.1 Dashboard Statistics

```typescript
// src/admin/services/analytics.service.ts

async getDashboardStats(period: 'today' | 'week' | 'month'): Promise<Stats> {
  const cacheKey = `admin:stats:${period}`;

  const cached = await this.cacheManager.get<Stats>(cacheKey);
  if (cached) return cached;

  const stats = await this.calculateDashboardStats(period);

  // Cache based on period
  const ttl = period === 'today' ? 300000 : 3600000; // 5 min vs 1 hour
  await this.cacheManager.set(cacheKey, stats, ttl);

  return stats;
}

async getTopSellingProducts(limit: number = 10): Promise<Product[]> {
  const cacheKey = `admin:top-products:${limit}`;

  const cached = await this.cacheManager.get<Product[]>(cacheKey);
  if (cached) return cached;

  const products = await this.analyticsRepository.getTopSelling(limit);

  // Cache for 1 hour
  await this.cacheManager.set(cacheKey, products, 3600000);

  return products;
}
```

**Cache Keys:**
- `admin:stats:{period}` → DashboardStats
- `admin:top-products:{limit}` → Product[]
- `admin:revenue:{period}` → RevenueStats
- TTL: 5 minutes to 1 hour (depending on freshness needs)

**Expected Impact:**
- **50% reduction** in expensive aggregation queries
- **<100ms** dashboard load time (vs 2-5 seconds)

---

### Phase 12: Security & Performance

**Priority:** 🔴 **CRITICAL**

#### 12.1 Rate Limiting

```typescript
// src/auth/guards/rate-limit.guard.ts

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id || request.ip;
    const endpoint = request.route.path;

    const key = `ratelimit:${userId}:${endpoint}`;

    // Get current count
    const count = await this.cacheManager.get<number>(key) || 0;

    // Check limit (e.g., 100 requests per minute)
    if (count >= 100) {
      throw new ThrottlerException('Too many requests');
    }

    // Increment with 60s TTL
    await this.cacheManager.set(key, count + 1, 60000);

    return true;
  }
}
```

---

#### 12.2 Session Management

```typescript
// Store active sessions
async createSession(userId: number, sessionId: string, metadata: any): Promise<void> {
  const key = `session:${sessionId}`;

  await this.cacheManager.set(key, { userId, ...metadata }, 86400000); // 24 hours

  // Track user sessions
  const userSessionsKey = `user:${userId}:sessions`;
  const sessions = await this.cacheManager.get<string[]>(userSessionsKey) || [];
  sessions.push(sessionId);
  await this.cacheManager.set(userSessionsKey, sessions, 86400000);
}

async invalidateAllUserSessions(userId: number): Promise<void> {
  const userSessionsKey = `user:${userId}:sessions`;
  const sessions = await this.cacheManager.get<string[]>(userSessionsKey) || [];

  // Delete all sessions
  for (const sessionId of sessions) {
    await this.cacheManager.del(`session:${sessionId}`);
  }

  await this.cacheManager.del(userSessionsKey);
}
```

---

## Redis Key Naming Conventions

### Standard Format
```
{entity}:{id}:{sub-entity}:{filter-hash}
```

### Examples
```
perm:123:456:product:read          → Permission check result
user:123:orgs                      → User's organizations
org:456                            → Organization profile
org:456:members                    → Organization members
product:789                        → Product without variants
product:789:with-variants          → Product with variants
cart:123                           → User's cart
stock:456                          → Variant stock level
session:abc-def-ghi                → User session
ratelimit:123:POST:/api/orders     → Rate limit counter
admin:stats:today                  → Dashboard stats for today
commission:789:1000                → Commission for product at price
```

### Key Prefixes by Phase
- **Phase 2:** `perm:`, `jwt:`, `user:orgs:`
- **Phase 3:** `org:`, `org:search:`
- **Phase 4:** `attr:`
- **Phase 5:** `product:`, `category:`
- **Phase 6:** `commission:`, `order:`
- **Phase 8:** `shipping:`
- **Phase 9:** `refunds:`
- **Phase 10:** `cart:`, `stock:`
- **Phase 11:** `admin:`
- **Phase 12:** `session:`, `ratelimit:`

---

## Performance Targets

### Before Redis (Current Baseline)
- Permission check: **50-100ms** (DB query)
- Product page load: **200-500ms** (multiple DB queries)
- Dashboard load: **2-5 seconds** (heavy aggregations)
- Cart operations: **100-200ms**

### After Redis (Target)
- Permission check: **<5ms** (cache hit) ✅
- Product page load: **<50ms** (cache hit) ✅
- Dashboard load: **<500ms** (cache hit) ✅
- Cart operations: **<20ms** (cache hit) ✅

### Cache Hit Rate Targets
- **Permissions:** 90%+ (very stable)
- **Products:** 80%+ (moderate changes)
- **Org data:** 85%+ (infrequent changes)
- **Dashboard:** 70%+ (acceptable staleness)

### Database Load Reduction
- **Overall:** 60-80% reduction in query volume
- **Permission checks:** 90% reduction
- **Product queries:** 75% reduction
- **Organization lookups:** 80% reduction

---

## Implementation Priority

### 🔴 IMMEDIATE (Phase 2 - Week 1)
1. **Permission caching** - Biggest performance win
2. **JWT blacklist** - Security requirement
3. **Org context caching** - Foundation for all phases

### 🟡 MEDIUM PRIORITY (Phases 3-6 - Weeks 2-6)
4. **Organization profile caching** - Moderate traffic
5. **Product catalog caching** - High traffic, big impact
6. **Category tree caching** - Rarely changes
7. **Commission caching** - Reduces calculation overhead

### 🟢 LOW PRIORITY (Phases 8-10 - Weeks 7-10)
8. **Shipping rate caching** - Low traffic
9. **Refund history caching** - Infrequent access
10. **Cart caching** - Already fast enough
11. **Stock level caching** - Be cautious with TTL

### 🔴 CRITICAL (Phase 11-12 - Weeks 11-16)
12. **Dashboard/analytics caching** - Huge performance gain
13. **Rate limiting** - Security requirement
14. **Session management** - Scalability requirement

---

## Monitoring & Maintenance

### Redis Metrics to Track
```typescript
// src/shared/services/redis-metrics.service.ts

@Injectable()
export class RedisMetricsService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async getMetrics(): Promise<RedisMetrics> {
    const store = await this.cacheManager.store;
    const client = store.client;

    const info = await client.info();

    return {
      usedMemory: this.parseInfo(info, 'used_memory_human'),
      hitRate: this.calculateHitRate(info),
      totalKeys: await client.dbsize(),
      evictedKeys: this.parseInfo(info, 'evicted_keys'),
      connectedClients: this.parseInfo(info, 'connected_clients'),
    };
  }
}
```

### Cache Invalidation Strategy

**On Data Update:**
```typescript
// Always invalidate related caches
async updateProduct(id: number, data: UpdateProductDto): Promise<Product> {
  const updated = await this.productRepository.update(id, data);

  // Invalidate all related caches
  await this.cacheManager.del(`product:${id}`);
  await this.cacheManager.del(`product:${id}:with-variants`);
  await this.deleteByPattern(`org:${updated.organizationId}:products`);
  await this.deleteByPattern(`category:*:products`); // If category changed

  return updated;
}
```

**On Critical Events:**
- User role changed → Invalidate all user permissions
- Org status changed → Invalidate org profile + user org lists
- Product stock updated → Invalidate stock cache
- Commission rules updated → Invalidate all commission caches

### Health Checks
```typescript
// Add to src/health/health.controller.ts

@Get('redis')
async checkRedis(): Promise<HealthCheckResult> {
  try {
    const store = await this.cacheManager.store;
    const client = store.client;
    await client.ping();

    return {
      status: 'healthy',
      timestamp: new Date(),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date(),
    };
  }
}
```

---

## Next Steps

### Week 1: Foundation (Phase 2)
- [ ] Implement permission caching in `PermissionCheckerService`
- [ ] Add JWT blacklist in `AuthService`
- [ ] Add org context caching in `OrganizationContextService`
- [ ] Add cache invalidation on role/permission updates
- [ ] Test cache hit rates

### Week 2-3: Core Data (Phase 3-5)
- [ ] Add organization profile caching
- [ ] Implement product catalog caching
- [ ] Add category tree caching
- [ ] Monitor cache performance

### Week 4-6: Business Logic (Phase 6)
- [ ] Add commission caching
- [ ] Implement order item caching
- [ ] Test cache invalidation flows

### Week 7-10: Supporting Features (Phases 8-10)
- [ ] Add shipping rate caching
- [ ] Implement cart caching
- [ ] Add stock level caching (careful with TTL)

### Week 11-16: Analytics & Security (Phases 11-12)
- [ ] Implement dashboard caching
- [ ] Add rate limiting with Redis
- [ ] Implement session management
- [ ] Set up Redis monitoring

---

## Summary

### Key Takeaways
1. **Redis is already configured** ✅ - Just need to use it strategically
2. **Phase 2 (Auth) is CRITICAL** 🔴 - Implement permission caching FIRST
3. **Never cache financial data** ⚠️ - Balances, payments, transactions
4. **Cache invalidation is key** 🔑 - Always invalidate on updates
5. **Monitor cache hit rates** 📊 - Aim for 70-90% depending on data type

### Expected Overall Impact
- **60-80% reduction** in database query volume
- **3-5x faster** API response times
- **10x faster** dashboard load times
- **Better scalability** - Can handle 10x more traffic with same DB

### Files to Modify
- All `*.service.ts` files - Add caching layer
- All `*.repository.ts` files - Consider caching results
- `src/auth/guards/*.guard.ts` - Add rate limiting
- `src/shared/services/` - Add RedisMetricsService
- `src/health/health.controller.ts` - Add Redis health check

---

**Ready to implement?** Start with **Phase 2: Permission Caching** - it's the foundation for everything else and gives you the biggest performance win! 🚀

import { Module } from '@nestjs/common';
import { OrganizationModule } from '../organization/organization.module';
import { ReportsModule } from '../reports/reports.module';
import { VendorsModule } from '../vendors/vendors.module';

/**
 * PlatformModule groups super admin / platform management features
 * This includes:
 * - Organization management (approve vendors, suspend, manage)
 * - Platform-wide analytics and reports
 * - Vendor balance & payout management
 *
 * Used by: Super Admin only
 * Route prefix: /api/v1/platform/* or /api/v1/admin/*
 */
@Module({
  imports: [
    OrganizationModule, // Manage vendors
    ReportsModule,      // Platform analytics
    VendorsModule,      // Vendor balances & payouts
  ],
  exports: [OrganizationModule, ReportsModule, VendorsModule],
})
export class PlatformModule {}

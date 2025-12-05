import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  Request,
} from '@nestjs/common';
import { Auth } from '../../auth/decorator/auth.decorator';
import { AuthType } from '../../auth/enums/auth-type.enum';
import { Permissions } from '../../auth/decorator/permissions.decorator';
import { VendorsService } from '../vendors.service';
import { BasePaginationDto } from '../../shared/dtos';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { CacheTTL } from '../../shared/decorators/cache-ttl.decorator';

/**
 * Platform Vendor Management Controller
 *
 * Handles platform admin operations for vendor management:
 * - View all vendor balances
 * - Approve payout requests
 * - Process payouts
 *
 * Access: Super Admin / Platform Admin only
 */
@Controller('platform/vendors')
@Auth(AuthType.Bearer)
export class PlatformVendorController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Get('balances')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60000)
  @Permissions('platform:vendor:balance:view')
  @HttpCode(HttpStatus.OK)
  async getAllVendorBalances(@Query() paginationDto: BasePaginationDto) {
    return this.vendorsService.getAllVendorBalances();
  }

  @Get(':id/balance')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(30000)
  @Permissions('platform:vendor:balance:view')
  @HttpCode(HttpStatus.OK)
  async getVendorBalance(@Param('id', ParseIntPipe) organizationId: number) {
    return this.vendorsService.getVendorBalanceById(organizationId);
  }

  @Get('payouts')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(30000)
  @Permissions('platform:vendor:payout:approve')
  @HttpCode(HttpStatus.OK)
  async getAllPayouts(@Query() paginationDto: BasePaginationDto) {
    return this.vendorsService.getAllPayouts();
  }

  @Patch('payouts/:id/approve')
  @Permissions('platform:vendor:payout:approve')
  @HttpCode(HttpStatus.OK)
  async approvePayout(
    @Param('id', ParseIntPipe) payoutId: number,
    @Request() req: any,
  ) {
    const approvedBy = req.user?.sub;
    if (!approvedBy) {
      throw new Error('User ID not found in token');
    }
    return this.vendorsService.approvePayout(payoutId, approvedBy);
  }

  @Patch('payouts/:id/process')
  @Permissions('platform:vendor:payout:process')
  @HttpCode(HttpStatus.OK)
  async processPayout(
    @Param('id', ParseIntPipe) payoutId: number,
    @Body() body: { transactionReference?: string },
    @Request() req: any,
  ) {
    const processedBy = req.user?.sub;
    if (!processedBy) {
      throw new Error('User ID not found in token');
    }
    return this.vendorsService.processPayout(
      payoutId,
      processedBy,
      body.transactionReference,
    );
  }
}

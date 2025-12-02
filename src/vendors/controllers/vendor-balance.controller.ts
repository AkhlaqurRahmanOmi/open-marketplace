import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  Request,
} from '@nestjs/common';
import { Auth } from '../../auth/decorator/auth.decorator';
import { AuthType } from '../../auth/enums/auth-type.enum';
import { Permissions } from '../../auth/decorator/permissions.decorator';
import { VendorsService } from '../vendors.service';
import { VendorBalanceQueryDto, RequestPayoutDto } from '../dtos';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { CacheTTL } from '../../shared/decorators/cache-ttl.decorator';

/**
 * Vendor Balance Controller
 *
 * Handles vendor financial operations:
 * - View balance and transactions
 * - Request payouts
 * - View payout history
 *
 * All endpoints are scoped to the authenticated user's organization
 */
@Controller('vendor/balance')
@Auth(AuthType.Bearer)
export class VendorBalanceController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(30000)
  @Permissions('vendor:balance:view')
  @HttpCode(HttpStatus.OK)
  async getBalance(@Request() req: any) {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      throw new Error('Organization ID not found in token');
    }
    return this.vendorsService.getVendorBalance(organizationId);
  }

  @Get('transactions')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(30000)
  @Permissions('vendor:balance:view')
  @HttpCode(HttpStatus.OK)
  async getTransactions(
    @Query() queryDto: VendorBalanceQueryDto,
    @Request() req: any,
  ) {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      throw new Error('Organization ID not found in token');
    }
    return this.vendorsService.getVendorTransactions(organizationId, queryDto);
  }

  @Post('payout/request')
  @Permissions('vendor:balance:request-payout')
  @HttpCode(HttpStatus.CREATED)
  async requestPayout(
    @Body() dto: RequestPayoutDto,
    @Request() req: any,
  ) {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      throw new Error('Organization ID not found in token');
    }
    return this.vendorsService.requestPayout(organizationId, dto);
  }

  @Get('payouts')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(30000)
  @Permissions('vendor:payout:view')
  @HttpCode(HttpStatus.OK)
  async getPayouts(
    @Query() queryDto: VendorBalanceQueryDto,
    @Request() req: any,
  ) {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      throw new Error('Organization ID not found in token');
    }
    return this.vendorsService.getVendorPayouts(organizationId, queryDto);
  }
}

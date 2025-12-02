import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { Auth } from '../../auth/decorator/auth.decorator';
import { AuthType } from '../../auth/enums/auth-type.enum';
import { Permissions } from '../../auth/decorator/permissions.decorator';
import { ShippingService } from '../../shipping/shipping.service';
import {
  CreateShipmentDto,
  UpdateShipmentDto,
  ShipmentFilterDto,
} from '../../shipping/dtos';
import { ShipmentStatus } from '@prisma/client';

/**
 * Vendor Shipment Controller (Phase 8: Multi-Vendor Shipping)
 *
 * Allows vendors to manage their own shipments:
 * - Create shipments for their order items
 * - View their shipments
 * - Update tracking information
 * - Mark shipments as shipped/delivered
 *
 * Access: Vendor users with proper organization context
 */
@Controller('vendor/shipments')
@Auth(AuthType.Bearer)
export class VendorShipmentController {
  constructor(private readonly shippingService: ShippingService) {}

  @Post()
  @Permissions('vendor:shipment:create')
  @HttpCode(HttpStatus.CREATED)
  async createShipment(
    @Body() dto: CreateShipmentDto,
    @Request() req: any,
  ) {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      throw new Error('Organization context required');
    }

    // Ensure the shipment is for this vendor's organization
    dto.organizationId = organizationId;

    return this.shippingService.createShipment(dto);
  }

  @Get()
  @Permissions('vendor:shipment:view')
  @HttpCode(HttpStatus.OK)
  async getMyShipments(
    @Query() filterDto: ShipmentFilterDto,
    @Request() req: any,
  ) {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      throw new Error('Organization context required');
    }

    return this.shippingService.getOrganizationShipments(
      organizationId,
      filterDto,
    );
  }

  @Get('pending')
  @Permissions('vendor:shipment:view')
  @HttpCode(HttpStatus.OK)
  async getPendingShipments(@Request() req: any) {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      throw new Error('Organization context required');
    }

    return this.shippingService.getShipmentsByStatus(
      organizationId,
      ShipmentStatus.pending,
    );
  }

  @Get('shipped')
  @Permissions('vendor:shipment:view')
  @HttpCode(HttpStatus.OK)
  async getShippedShipments(@Request() req: any) {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      throw new Error('Organization context required');
    }

    return this.shippingService.getShipmentsByStatus(
      organizationId,
      ShipmentStatus.shipped,
    );
  }

  @Get(':id')
  @Permissions('vendor:shipment:view')
  @HttpCode(HttpStatus.OK)
  async getShipmentById(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      throw new Error('Organization context required');
    }

    return this.shippingService.getShipmentById(id, organizationId);
  }

  @Patch(':id')
  @Permissions('vendor:shipment:update')
  @HttpCode(HttpStatus.OK)
  async updateShipment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateShipmentDto,
    @Request() req: any,
  ) {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      throw new Error('Organization context required');
    }

    return this.shippingService.updateShipment(id, dto, organizationId);
  }

  @Patch(':id/ship')
  @Permissions('vendor:shipment:update')
  @HttpCode(HttpStatus.OK)
  async markAsShipped(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { trackingNumber?: string },
    @Request() req: any,
  ) {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      throw new Error('Organization context required');
    }

    return this.shippingService.markShipmentAsShipped(
      id,
      body.trackingNumber,
      organizationId,
    );
  }

  @Patch(':id/deliver')
  @Permissions('vendor:shipment:update')
  @HttpCode(HttpStatus.OK)
  async markAsDelivered(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      throw new Error('Organization context required');
    }

    return this.shippingService.markShipmentAsDelivered(id, organizationId);
  }

  @Get('order/:orderId')
  @Permissions('vendor:shipment:view')
  @HttpCode(HttpStatus.OK)
  async getShipmentsForOrder(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Request() req: any,
  ) {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      throw new Error('Organization context required');
    }

    // Get all shipments for the order, filtered by organization
    const shipments = await this.shippingService.getOrderShipments(orderId);
    return shipments.filter((s) => s.organizationId === organizationId);
  }
}

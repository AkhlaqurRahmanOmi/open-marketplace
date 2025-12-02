import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Shipment, ShipmentStatus } from '@prisma/client';
import { ShipmentRepository } from '../repositories/shipment.repository';
import { CreateShipmentDto, UpdateShipmentDto, ShipmentFilterDto } from '../dtos';
import { PrismaService } from '../../core/config/prisma/prisma.service';
import { UnitOfWorkService } from '../../shared/services/unit-of-work.service';

@Injectable()
export class ShipmentManagementProvider {
  private readonly logger = new Logger(ShipmentManagementProvider.name);

  constructor(
    private readonly shipmentRepository: ShipmentRepository,
    private readonly prisma: PrismaService,
    private readonly unitOfWork: UnitOfWorkService,
  ) {}

  /**
   * Create a shipment for a vendor's order items (Phase 8: Multi-vendor)
   * Each vendor creates their own shipment for their items in an order
   */
  async createShipment(dto: CreateShipmentDto): Promise<Shipment> {
    // Validate that order exists
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
    });

    if (!order) {
      throw new NotFoundException(`Order ${dto.orderId} not found`);
    }

    // Validate that all order items belong to this organization
    const orderItems = await this.prisma.orderItem.findMany({
      where: {
        id: { in: dto.fulfillmentItems.map((item) => item.orderItemId) },
      },
    });

    const invalidItems = orderItems.filter(
      (item) => item.organizationId !== dto.organizationId,
    );

    if (invalidItems.length > 0) {
      throw new BadRequestException(
        `Some order items do not belong to organization ${dto.organizationId}`,
      );
    }

    // Validate quantities
    for (const fulfillmentItem of dto.fulfillmentItems) {
      const orderItem = orderItems.find(
        (item) => item.id === fulfillmentItem.orderItemId,
      );

      if (!orderItem) {
        throw new NotFoundException(
          `Order item ${fulfillmentItem.orderItemId} not found`,
        );
      }

      if (fulfillmentItem.quantity > orderItem.quantity) {
        throw new BadRequestException(
          `Fulfillment quantity (${fulfillmentItem.quantity}) exceeds order quantity (${orderItem.quantity}) for item ${fulfillmentItem.orderItemId}`,
        );
      }
    }

    return this.unitOfWork.transaction(async (tx) => {
      // Create shipment
      const shipment = await tx.shipment.create({
        data: {
          orderId: dto.orderId,
          organizationId: dto.organizationId,
          fromLocationId: dto.fromLocationId,
          carrier: dto.carrier,
          service: dto.service,
          trackingNumber: dto.trackingNumber,
          status: dto.status || ShipmentStatus.pending,
          fulfillmentItems: {
            create: dto.fulfillmentItems.map((item) => ({
              orderItemId: item.orderItemId,
              quantity: item.quantity,
            })),
          },
        },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
          fulfillmentItems: {
            include: {
              orderItem: true,
            },
          },
        },
      });

      this.logger.log(
        `Created shipment ${shipment.id} for organization ${dto.organizationId}, order ${dto.orderId}`,
      );

      return shipment;
    });
  }

  /**
   * Get all shipments for a vendor's organization
   */
  async getOrganizationShipments(
    organizationId: number,
    filterDto?: ShipmentFilterDto,
  ): Promise<any> {
    const filters: any = { organizationId };

    if (filterDto?.orderId) {
      filters.orderId = filterDto.orderId;
    }

    if (filterDto?.status) {
      filters.status = filterDto.status;
    }

    if (filterDto?.fromLocationId) {
      filters.fromLocationId = filterDto.fromLocationId;
    }

    return this.shipmentRepository.findWithFilters({
      filters,
      pagination: {
        page: filterDto?.page || 1,
        limit: filterDto?.limit || 10,
      },
    });
  }

  /**
   * Get a specific shipment (with organization check)
   */
  async getShipmentById(id: number, organizationId?: number): Promise<Shipment> {
    const shipment = await this.shipmentRepository.findByIdWithFullDetails(id);

    if (!shipment) {
      throw new NotFoundException(`Shipment ${id} not found`);
    }

    // If organizationId is provided, verify ownership
    if (organizationId && shipment.organizationId !== organizationId) {
      throw new NotFoundException(`Shipment ${id} not found`);
    }

    return shipment;
  }

  /**
   * Update shipment (vendor can update their own shipments)
   */
  async updateShipment(
    id: number,
    dto: UpdateShipmentDto,
    organizationId?: number,
  ): Promise<Shipment> {
    const shipment = await this.shipmentRepository.findById(id);

    if (!shipment) {
      throw new NotFoundException(`Shipment ${id} not found`);
    }

    // If organizationId is provided, verify ownership
    if (organizationId && shipment.organizationId !== organizationId) {
      throw new NotFoundException(`Shipment ${id} not found`);
    }

    const updateData: any = { ...dto };

    // Auto-set timestamps based on status changes
    if (dto.status === ShipmentStatus.shipped && !dto.shippedAt) {
      updateData.shippedAt = new Date();
    }

    if (dto.status === ShipmentStatus.delivered && !dto.deliveredAt) {
      updateData.deliveredAt = new Date();
    }

    const updatedShipment = await this.shipmentRepository.update(id, updateData);

    this.logger.log(
      `Updated shipment ${id} for organization ${shipment.organizationId}`,
    );

    return updatedShipment;
  }

  /**
   * Get all shipments for an order (grouped by vendor)
   */
  async getOrderShipments(orderId: number): Promise<Shipment[]> {
    return this.shipmentRepository.findByOrderId(orderId);
  }

  /**
   * Mark shipment as shipped
   */
  async markAsShipped(
    id: number,
    trackingNumber?: string,
    organizationId?: number,
  ): Promise<Shipment> {
    return this.updateShipment(
      id,
      {
        status: ShipmentStatus.shipped,
        trackingNumber: trackingNumber,
        shippedAt: new Date(),
      },
      organizationId,
    );
  }

  /**
   * Mark shipment as delivered
   */
  async markAsDelivered(id: number, organizationId?: number): Promise<Shipment> {
    return this.updateShipment(
      id,
      {
        status: ShipmentStatus.delivered,
        deliveredAt: new Date(),
      },
      organizationId,
    );
  }

  /**
   * Get shipments by status for an organization
   */
  async getShipmentsByStatus(
    organizationId: number,
    status: ShipmentStatus,
  ): Promise<Shipment[]> {
    return this.shipmentRepository.findByOrganizationAndStatus(
      organizationId,
      status,
    );
  }

  /**
   * Auto-create shipments for all vendor items in an order
   * This can be called when order is placed or when vendor starts fulfillment
   */
  async autoCreateShipmentsForOrder(orderId: number): Promise<Shipment[]> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: {
            variant: {
              include: {
                variantInventories: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    // Group order items by organization
    const itemsByOrg = order.orderItems.reduce((acc, item) => {
      if (!acc[item.organizationId]) {
        acc[item.organizationId] = [];
      }
      acc[item.organizationId].push(item);
      return acc;
    }, {} as Record<number, any[]>);

    const shipments: Shipment[] = [];

    // Create a shipment for each organization
    for (const [orgId, items] of Object.entries(itemsByOrg)) {
      const organizationId = parseInt(orgId);

      // Find best location for this organization's items
      const fromLocationId = items[0]?.variant?.variantInventories?.[0]?.locationId;

      const shipment = await this.createShipment({
        orderId,
        organizationId,
        fromLocationId,
        status: ShipmentStatus.pending,
        fulfillmentItems: items.map((item) => ({
          orderItemId: item.id,
          quantity: item.quantity,
        })),
      });

      shipments.push(shipment);
    }

    this.logger.log(
      `Auto-created ${shipments.length} shipments for order ${orderId}`,
    );

    return shipments;
  }
}

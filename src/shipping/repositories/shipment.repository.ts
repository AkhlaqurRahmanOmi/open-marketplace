import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/core/config/prisma/prisma.service';
import { BaseRepository } from 'src/shared/repository/base.repository';
import { Shipment, Prisma } from '@prisma/client';

export type ShipmentWithRelations = Shipment & {
  order?: any;
  organization?: any;
  fromLocation?: any;
  fulfillmentItems?: any[];
};

@Injectable()
export class ShipmentRepository extends BaseRepository<Shipment, number> {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private readonly baseInclude = {
    organization: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },
    fromLocation: {
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
      },
    },
    fulfillmentItems: {
      include: {
        orderItem: {
          include: {
            variant: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  async findById(id: number): Promise<ShipmentWithRelations | null> {
    return this.prisma.shipment.findUnique({
      where: { id },
      include: this.baseInclude,
    });
  }

  async findAll(): Promise<Shipment[]> {
    return this.prisma.shipment.findMany({
      include: this.baseInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: Prisma.ShipmentCreateInput): Promise<Shipment> {
    return this.prisma.shipment.create({
      data,
      include: this.baseInclude,
    });
  }

  async update(id: number, data: Prisma.ShipmentUpdateInput): Promise<Shipment> {
    return this.prisma.shipment.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: this.baseInclude,
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.shipment.delete({
      where: { id },
    });
  }

  async findWithFilters(options: any): Promise<any> {
    const {
      filters = {},
      pagination = { page: 1, limit: 10 },
      sort,
    } = options;
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const where: Prisma.ShipmentWhereInput = { ...filters };

    const [data, total] = await Promise.all([
      this.prisma.shipment.findMany({
        where,
        skip,
        take: limit,
        orderBy: sort
          ? { [sort.field]: sort.order }
          : { createdAt: 'desc' },
        include: this.baseInclude,
      }),
      this.prisma.shipment.count({ where }),
    ]);

    return {
      data,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  async search(query: string, fields: string[]): Promise<Shipment[]> {
    return this.prisma.shipment.findMany({
      where: {
        OR: [
          { trackingNumber: { contains: query, mode: 'insensitive' } },
          { carrier: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: this.baseInclude,
      take: 20,
    });
  }

  async countTotal(filters?: any): Promise<number> {
    return this.prisma.shipment.count({
      where: filters,
    });
  }

  // Specialized methods for multi-vendor shipment operations

  /**
   * Find all shipments for a specific organization
   */
  async findByOrganizationId(organizationId: number): Promise<Shipment[]> {
    return this.prisma.shipment.findMany({
      where: { organizationId },
      include: this.baseInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find all shipments for a specific order
   */
  async findByOrderId(orderId: number): Promise<Shipment[]> {
    return this.prisma.shipment.findMany({
      where: { orderId },
      include: this.baseInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find shipments for a specific order and organization
   */
  async findByOrderAndOrganization(
    orderId: number,
    organizationId: number,
  ): Promise<Shipment[]> {
    return this.prisma.shipment.findMany({
      where: {
        orderId,
        organizationId,
      },
      include: this.baseInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get shipment with full order details
   */
  async findByIdWithFullDetails(id: number): Promise<ShipmentWithRelations | null> {
    return this.prisma.shipment.findUnique({
      where: { id },
      include: {
        ...this.baseInclude,
        order: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            shippingAddress: true,
          },
        },
      },
    });
  }

  /**
   * Get shipments by status for an organization
   */
  async findByOrganizationAndStatus(
    organizationId: number,
    status: string,
  ): Promise<Shipment[]> {
    return this.prisma.shipment.findMany({
      where: {
        organizationId,
        status: status as any,
      },
      include: this.baseInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Count shipments by organization
   */
  async countByOrganization(organizationId: number): Promise<number> {
    return this.prisma.shipment.count({
      where: { organizationId },
    });
  }
}

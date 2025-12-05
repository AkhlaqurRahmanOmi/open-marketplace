import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Order, OrderStatus } from '@prisma/client';
import { OrderRepository } from '../repositories/order.repository';
import { CreateOrderDto, UpdateOrderStatusDto, CancelOrderDto, OrderFilterDto } from '../dtos';
import { PaginatedResult } from '../../shared/types';
import { PrismaService } from '../../core/config/prisma/prisma.service';
import { InventoryService } from '../../inventory/inventory.service';
import { BundlesService } from '../../bundles/bundles.service';
import { UnitOfWorkService } from '../../shared/services/unit-of-work.service';
import { ShippingService } from '../../shipping/shipping.service';
import { CommissionCalculatorProvider } from './commission-calculator.provider';
import { VendorBalanceManagementProvider } from '../../vendors/providers/vendor-balance-management.provider';

@Injectable()
export class OrderManagementProvider {
  private readonly logger = new Logger(OrderManagementProvider.name);

  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
    private readonly bundles: BundlesService,
    private readonly unitOfWork: UnitOfWorkService,
    private readonly shippingService: ShippingService,
    private readonly commissionCalculator: CommissionCalculatorProvider,
    private readonly vendorBalanceManagement: VendorBalanceManagementProvider,
  ) {}

  async createOrder(createOrderDto: CreateOrderDto): Promise<Order> {
    // Step 1: Validate shipping method if provided
    let shippingCost = 0;
    if (createOrderDto.shippingMethodId) {
      const shippingMethod = await this.shippingService.getShippingMethodById(createOrderDto.shippingMethodId);
      if (!shippingMethod || !shippingMethod.isActive) {
        throw new NotFoundException(`Shipping method ${createOrderDto.shippingMethodId} not found or inactive`);
      }
    }

    // Step 2: Check inventory availability for all items BEFORE transaction
    for (const item of createOrderDto.items) {
      // Validate that either variantId or bundleId is provided
      if (!item.variantId && !item.bundleId) {
        throw new BadRequestException(`Either variantId or bundleId is required for order item`);
      }

      // Handle bundle items
      if (item.bundleId) {
        await this.bundles.validateBundleForOrder(item.bundleId, item.quantity);
        item['_isBundle'] = true;
        continue;
      }

      // Handle regular variant items
      if (item.variantId) {
        const locationId = await this.inventory.findBestLocationForFulfillment(
          item.variantId,
          item.quantity,
        );

        if (!locationId) {
          throw new BadRequestException(
            `Insufficient inventory for variant ${item.variantId}. Requested: ${item.quantity}`,
          );
        }

        item['_fulfillmentLocationId'] = locationId;
      }
    }

    // Step 3: Create order and items in transaction
    const order = await this.unitOfWork.transaction(async (tx) => {
      // Calculate totals and validate variants
      let subtotal = 0;
      let totalWeight = 0;
      const variants = new Map();
      const organizationTypes = new Map();

      for (const item of createOrderDto.items) {
        const variant = await tx.variant.findUnique({
          where: { id: item.variantId },
          include: {
            product: {
              include: {
                productCategories: {
                  take: 1, // Get primary category
                  include: {
                    category: true,
                  },
                },
                organization: {
                  select: {
                    id: true,
                    name: true,
                    feeType: true,
                    feeAmount: true,
                    type: true,
                  },
                },
              },
            },
          },
        });
        if (!variant) {
          throw new NotFoundException(`Variant ${item.variantId} not found`);
        }
        variants.set(item.variantId, variant);
        subtotal += variant.price * item.quantity;
        totalWeight += (variant.weight || 0) * item.quantity;

        // Cache organization type for commission calculation
        const orgType = variant.product.organization.type;
        if (!organizationTypes.has(orgType)) {
          const orgTypeData = await tx.organizationType.findFirst({
            where: { code: orgType },
            select: {
              code: true,
              defaultFeeType: true,
              defaultFeeAmount: true,
            },
          });
          if (orgTypeData) {
            organizationTypes.set(orgType, orgTypeData);
          }
        }
      }

      // Calculate shipping cost
      if (createOrderDto.shippingMethodId) {
        const shippingRate = await this.shippingService.calculateRate({
          shippingMethodId: createOrderDto.shippingMethodId,  // Changed from methodId
          subtotal,
          weight: totalWeight,
        });
        shippingCost = shippingRate.calculatedRate;  // Changed from .cost
      }

      // Generate unique order reference
      const year = new Date().getFullYear();
      const lastOrder = await tx.order.findFirst({
        orderBy: { id: 'desc' },
        select: { id: true },
      });
      const orderNumber = (lastOrder?.id || 0) + 1;
      const externalRef = `ORD-${year}-${String(orderNumber).padStart(4, '0')}`;

      // Create order with shipping
      const newOrder = await tx.order.create({
        data: {
          userId: createOrderDto.userId,
          externalRef,
          subtotalAmount: subtotal,
          shippingAmount: shippingCost,
          totalAmount: subtotal + shippingCost,
          shippingMethodId: createOrderDto.shippingMethodId,
          currentStatus: OrderStatus.pending,
          billingAddressId: createOrderDto.billingAddressId,
          shippingAddressId: createOrderDto.shippingAddressId,
          placedAt: new Date(),
        },
      });

      // Create order items with commission calculation (Phase 6: Multi-vendor)
      for (const item of createOrderDto.items) {
        const variant = variants.get(item.variantId);
        const lineTotal = variant.price * item.quantity;

        // Get organizationId from the product
        const organizationId = variant.product.organizationId;

        // Prepare commission hierarchy data (zero additional queries - data already loaded!)
        const primaryCategory = variant.product.productCategories?.[0]?.category;
        const orgType = organizationTypes.get(variant.product.organization.type);

        const commissionData = {
          product: {
            feeType: variant.product.feeType,
            feeAmount: variant.product.feeAmount,
          },
          category: primaryCategory ? {
            feeType: primaryCategory.feeType,
            feeAmount: primaryCategory.feeAmount,
          } : undefined,
          organization: {
            feeType: variant.product.organization.feeType,
            feeAmount: variant.product.organization.feeAmount,
            type: variant.product.organization.type,
          },
          organizationType: orgType ? {
            defaultFeeType: orgType.defaultFeeType,
            defaultFeeAmount: orgType.defaultFeeAmount,
          } : undefined,
        };

        // Calculate commission using OPTIMIZED method (no database queries)
        const commission = this.commissionCalculator.calculateCommissionFromData(
          lineTotal,
          commissionData,
        );

        this.logger.debug(
          `Order ${newOrder.id} - Item commission (source: ${commission.commissionSource}): ${JSON.stringify(commission)}`,
        );

        const orderItem = await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            organizationId: organizationId,
            variantId: item.variantId,
            bundleId: item.bundleId,
            quantity: item.quantity,
            unitPrice: variant.price,
            lineTotal: lineTotal,
            organizationAmount: commission.organizationAmount,
            platformFeeAmount: commission.platformFeeAmount,
            productNameSnapshot: variant.product?.name,
            variantSkuSnapshot: variant.sku,
          },
        });

        // Phase 6: Credit vendor balance (pending until order is delivered)
        await this.vendorBalanceManagement.creditFunds({
          organizationId: organizationId,
          amount: commission.organizationAmount,
          orderId: newOrder.id,
          description: `Order #${newOrder.externalRef} - Vendor commission`,
        });

        this.logger.log(
          `Credited ${commission.organizationAmount} to organization ${organizationId} for order ${newOrder.id}`,
        );
      }

      return newOrder;
    });

    // Step 4: Reserve inventory OUTSIDE transaction
    try {
      for (const item of createOrderDto.items) {
        if (item['_isBundle'] && item.bundleId) {
          await this.bundles.reserveBundleInventory(
            item.bundleId,
            item.quantity,
            order.id,
          );
          continue;
        }

        if (item.variantId && item['_fulfillmentLocationId']) {
          await this.inventory.reserveStock({
            variantId: item.variantId,
            locationId: item['_fulfillmentLocationId'],
            quantity: item.quantity,
            orderId: order.id,
          });
        }
      }
    } catch (error) {
      await this.orderRepository.updateStatus(order.id, OrderStatus.cancelled, 'Inventory reservation failed');
      throw new BadRequestException(
        `Failed to reserve inventory: ${error.message}`,
      );
    }

    // Step 5: Return order with relations
    const createdOrder = await this.orderRepository.findById(order.id);
    if (!createdOrder) {
      throw new Error('Failed to create order');
    }

    return createdOrder;
  }



  async updateOrderStatus(
    id: number,
    updateStatusDto: UpdateOrderStatusDto,
  ): Promise<Order> {
    const order = await this.orderRepository.findById(id);
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    // Get order items for processing
    const orderWithItems = await this.prisma.order.findUnique({
      where: { id },
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

    if (!orderWithItems) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    // If status is changing to 'shipped', fulfill the reserved inventory
    if (updateStatusDto.status === OrderStatus.shipped && order.currentStatus !== OrderStatus.shipped) {
      // Fulfill inventory for each order item
      for (const item of orderWithItems.orderItems) {
        if (!item.variantId) continue;

        // Find the location with reserved stock for this order
        const inventory = item.variant?.variantInventories.find(
          (inv) => inv.reserved > 0,
        );

        if (inventory) {
          try {
            await this.inventory.fulfillReservedStock(
              item.variantId,
              inventory.locationId,
              item.quantity,
              id,
            );
          } catch (error) {
            throw new BadRequestException(
              `Failed to fulfill inventory for variant ${item.variantSkuSnapshot}: ${error.message}`,
            );
          }
        } else {
          throw new BadRequestException(
            `No reserved inventory found for variant ${item.variantSkuSnapshot}`,
          );
        }
      }
    }

    // Phase 7: If status is changing to 'delivered', release vendor funds (pending → available)
    if (updateStatusDto.status === OrderStatus.delivered && order.currentStatus !== OrderStatus.delivered) {
      this.logger.log(`Order ${id} delivered - releasing vendor funds`);

      for (const item of orderWithItems.orderItems) {
        if (!item.organizationId || !item.organizationAmount) continue;

        try {
          await this.vendorBalanceManagement.releaseFunds({
            organizationId: item.organizationId,
            amount: item.organizationAmount,
            orderId: id,
            description: `Order #${order.externalRef} delivered - Funds released`,
          });

          this.logger.log(
            `Released ${item.organizationAmount} to organization ${item.organizationId} for delivered order ${id}`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to release funds for organization ${item.organizationId} on order ${id}: ${error.message}`,
          );
          // Don't fail the status update, but log the error for manual review
        }
      }
    }

    return this.orderRepository.updateStatus(id, updateStatusDto.status, updateStatusDto.note);
  }

  async cancelOrder(id: number, cancelDto: CancelOrderDto): Promise<Order> {
    const order = await this.orderRepository.findById(id);
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    // Can cancel pending or processing orders
    if (order.currentStatus !== OrderStatus.pending && order.currentStatus !== OrderStatus.processing) {
      throw new BadRequestException('Only pending or processing orders can be cancelled');
    }

    // Get order items for processing
    const orderWithItems = await this.prisma.order.findUnique({
      where: { id },
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

    if (!orderWithItems) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    // Release inventory for each order item
    for (const item of orderWithItems.orderItems) {
      if (!item.variantId) continue;

      // Find the location with reserved stock for this order
      const inventory = item.variant?.variantInventories.find(
        (inv) => inv.reserved > 0,
      );

      if (inventory) {
        try {
          await this.inventory.releaseStock({
            variantId: item.variantId,
            locationId: inventory.locationId,
            quantity: item.quantity,
            orderId: id,
          });
        } catch (error) {
          // Log error but don't fail the cancellation
          this.logger.error(
            `Failed to release inventory for variant ${item.variantSkuSnapshot}: ${error.message}`,
          );
        }
      }
    }

    // Phase 7: Refund vendor balance (remove pending funds and total earnings)
    this.logger.log(`Order ${id} cancelled - refunding vendor funds`);

    for (const item of orderWithItems.orderItems) {
      if (!item.organizationId || !item.organizationAmount) continue;

      try {
        await this.vendorBalanceManagement.refundFunds({
          organizationId: item.organizationId,
          amount: item.organizationAmount,
          orderId: id,
          description: `Order #${order.externalRef} cancelled - ${cancelDto.reason}`,
        });

        this.logger.log(
          `Refunded ${item.organizationAmount} from organization ${item.organizationId} for cancelled order ${id}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to refund funds for organization ${item.organizationId} on order ${id}: ${error.message}`,
        );
        // Don't fail the cancellation, but log the error for manual review
      }
    }

    return this.orderRepository.updateStatus(id, OrderStatus.cancelled, cancelDto.reason);
  }

  async getOrderById(id: number): Promise<Order> {
    const order = await this.orderRepository.findById(id);
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    return order;
  }

  async getUserOrders(userId: number): Promise<Order[]> {
    return this.orderRepository.findByUserId(userId);
  }

  async getAllOrders(filterDto: OrderFilterDto): Promise<PaginatedResult<Order>> {
    return this.orderRepository.findOrdersWithFilters(filterDto);
  }

  async getOrdersByStatus(status: OrderStatus): Promise<Order[]> {
    return this.orderRepository.findByStatus(status);
  }
}

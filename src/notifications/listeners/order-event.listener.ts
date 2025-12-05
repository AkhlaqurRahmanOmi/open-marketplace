import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  OrderPlacedEvent,
  OrderStatusChangedEvent,
  OrderShippedEvent,
} from '../events/order.events';
import { NotificationManagerService } from '../services/notification-manager.service';

@Injectable()
export class OrderEventListener {
  private readonly logger = new Logger(OrderEventListener.name);

  constructor(private readonly notificationManager: NotificationManagerService) {}

  @OnEvent('order.placed', { async: true })
  async handleOrderPlaced(event: OrderPlacedEvent) {
    try {
      this.logger.log(
        `Handling order.placed event for order ${event.orderId} [traceId: ${event.traceId}]`,
      );

      // Notify customer
      await this.notificationManager.sendForEvent('order.placed.customer', {
        userId: event.customerId,
        data: {
          orderId: event.orderId,
          orderNumber: event.orderNumber,
          total: event.total,
          items: event.items,
        },
      });

      // Notify vendor
      await this.notificationManager.sendForEvent('order.placed.vendor', {
        userId: event.vendorId,
        data: {
          orderId: event.orderId,
          orderNumber: event.orderNumber,
          total: event.total,
          itemCount: event.items.length,
        },
      });

      this.logger.log(`✅ Order placed notifications sent for order ${event.orderNumber}`);
    } catch (error) {
      this.logger.error(
        `❌ Failed to send order placed notifications:`,
        error.stack,
      );
    }
  }

  @OnEvent('order.status.changed', { async: true })
  async handleOrderStatusChanged(event: OrderStatusChangedEvent) {
    try {
      this.logger.log(
        `Handling order.status.changed event for order ${event.orderId} [traceId: ${event.traceId}]`,
      );

      await this.notificationManager.sendForEvent('order.status.changed', {
        userId: event.customerId,
        data: {
          orderId: event.orderId,
          orderNumber: event.orderNumber,
          oldStatus: event.oldStatus,
          newStatus: event.newStatus,
        },
      });

      this.logger.log(`✅ Order status changed notification sent for order ${event.orderNumber}`);
    } catch (error) {
      this.logger.error(
        `❌ Failed to send order status changed notification:`,
        error.stack,
      );
    }
  }

  @OnEvent('order.shipped', { async: true })
  async handleOrderShipped(event: OrderShippedEvent) {
    try {
      this.logger.log(
        `Handling order.shipped event for order ${event.orderId} [traceId: ${event.traceId}]`,
      );

      await this.notificationManager.sendForEvent('order.shipped', {
        userId: event.customerId,
        data: {
          orderId: event.orderId,
          orderNumber: event.orderNumber,
          trackingNumber: event.trackingNumber,
          carrier: event.carrier,
        },
      });

      this.logger.log(`✅ Order shipped notification sent for order ${event.orderNumber}`);
    } catch (error) {
      this.logger.error(
        `❌ Failed to send order shipped notification:`,
        error.stack,
      );
    }
  }
}

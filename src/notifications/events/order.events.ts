import { BaseEvent } from './base.event';

/**
 * Event emitted when an order is placed
 */
export class OrderPlacedEvent extends BaseEvent {
  readonly eventName = 'order.placed';

  constructor(
    public readonly orderId: number,
    public readonly orderNumber: string,
    public readonly customerId: number,
    public readonly vendorId: number,
    public readonly total: number,
    public readonly items: Array<{ productName: string; quantity: number }>,
    traceId?: string,
  ) {
    super(traceId);
  }

  protected getPayload(): Record<string, any> {
    return {
      orderId: this.orderId,
      orderNumber: this.orderNumber,
      customerId: this.customerId,
      vendorId: this.vendorId,
      total: this.total,
      itemCount: this.items.length,
    };
  }
}

/**
 * Event emitted when an order status changes
 */
export class OrderStatusChangedEvent extends BaseEvent {
  readonly eventName = 'order.status.changed';

  constructor(
    public readonly orderId: number,
    public readonly orderNumber: string,
    public readonly customerId: number,
    public readonly oldStatus: string,
    public readonly newStatus: string,
    traceId?: string,
  ) {
    super(traceId);
  }

  protected getPayload(): Record<string, any> {
    return {
      orderId: this.orderId,
      orderNumber: this.orderNumber,
      customerId: this.customerId,
      oldStatus: this.oldStatus,
      newStatus: this.newStatus,
    };
  }
}

/**
 * Event emitted when an order is shipped
 */
export class OrderShippedEvent extends BaseEvent {
  readonly eventName = 'order.shipped';

  constructor(
    public readonly orderId: number,
    public readonly orderNumber: string,
    public readonly customerId: number,
    public readonly trackingNumber?: string,
    public readonly carrier?: string,
    traceId?: string,
  ) {
    super(traceId);
  }

  protected getPayload(): Record<string, any> {
    return {
      orderId: this.orderId,
      orderNumber: this.orderNumber,
      customerId: this.customerId,
      hasTracking: !!this.trackingNumber,
      carrier: this.carrier,
    };
  }
}

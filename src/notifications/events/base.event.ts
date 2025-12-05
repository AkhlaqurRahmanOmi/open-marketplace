/**
 * Base class for all domain events
 * Provides type safety, metadata, and common functionality
 */
export abstract class BaseEvent {
  /**
   * Unique event name for routing to listeners
   */
  abstract readonly eventName: string;

  /**
   * Timestamp when event was created
   */
  readonly occurredAt: Date;

  /**
   * Optional trace ID for debugging across services
   */
  readonly traceId?: string;

  constructor(traceId?: string) {
    this.occurredAt = new Date();
    this.traceId = traceId || this.generateTraceId();
  }

  /**
   * Generate a simple trace ID for tracking
   */
  private generateTraceId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Serialize event to JSON for logging/debugging
   */
  toJSON(): Record<string, any> {
    return {
      eventName: this.eventName,
      occurredAt: this.occurredAt.toISOString(),
      traceId: this.traceId,
      ...this.getPayload(),
    };
  }

  /**
   * Get event-specific data (override in child classes)
   */
  protected abstract getPayload(): Record<string, any>;
}

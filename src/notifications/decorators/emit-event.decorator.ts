import { SetMetadata } from '@nestjs/common';
import { BaseEvent } from '../events/base.event';

export const EMIT_EVENT_KEY = 'emit_event_metadata';

export interface EmitEventMetadata {
  /**
   * Event class constructor or factory function
   */
  eventFactory: (...args: any[]) => BaseEvent;

  /**
   * Extract data from method result to create event
   * If not provided, the entire result is passed to event constructor
   */
  dataExtractor?: (result: any, ...methodArgs: any[]) => any[];

  /**
   * Emit event only if this condition returns true
   */
  condition?: (result: any, ...methodArgs: any[]) => boolean;
}

/**
 * Decorator to automatically emit an event after method execution
 *
 * @example
 * ```typescript
 * @EmitEvent({
 *   eventFactory: (user, otp) => new UserRegisteredEvent(
 *     user.id,
 *     user.email,
 *     user.name,
 *     otp
 *   ),
 *   dataExtractor: (result) => [result.user, result.otp],
 * })
 * async register(dto: RegisterDto) {
 *   const user = await this.userRepo.create(dto);
 *   const otp = this.generateOTP();
 *   return { user, otp };
 * }
 * ```
 */
export function EmitEvent(metadata: EmitEventMetadata) {
  return SetMetadata(EMIT_EVENT_KEY, metadata);
}

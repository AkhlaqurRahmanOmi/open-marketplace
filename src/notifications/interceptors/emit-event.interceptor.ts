import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Observable, tap } from 'rxjs';
import { EMIT_EVENT_KEY, EmitEventMetadata } from '../decorators/emit-event.decorator';
import { BaseEvent } from '../events/base.event';

/**
 * Interceptor that handles @EmitEvent decorator
 * Automatically emits events after method execution
 */
@Injectable()
export class EmitEventInterceptor implements NestInterceptor {
  private readonly logger = new Logger(EmitEventInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const metadata = this.reflector.get<EmitEventMetadata>(
      EMIT_EVENT_KEY,
      context.getHandler(),
    );

    if (!metadata) {
      return next.handle();
    }

    const methodName = context.getHandler().name;
    const className = context.getClass().name;

    return next.handle().pipe(
      tap((result) => {
        try {
          // Get method arguments
          const request = context.switchToHttp().getRequest();
          const methodArgs = context.getArgs();

          // Check condition if provided
          if (metadata.condition && !metadata.condition(result, ...methodArgs)) {
            this.logger.debug(
              `Condition not met, skipping event emission for ${className}.${methodName}`,
            );
            return;
          }

          // Extract data from result
          let eventArgs: any[];
          if (metadata.dataExtractor) {
            eventArgs = metadata.dataExtractor(result, ...methodArgs);
          } else {
            eventArgs = [result];
          }

          // Create event instance
          const event: BaseEvent = metadata.eventFactory(...eventArgs);

          // Emit the event
          this.eventEmitter.emit(event.eventName, event);

          this.logger.log(
            `Event emitted: ${event.eventName} from ${className}.${methodName} [traceId: ${event.traceId}]`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to emit event from ${className}.${methodName}:`,
            error.stack,
          );
          // Don't throw - event emission failure shouldn't break the business logic
        }
      }),
    );
  }
}

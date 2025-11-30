
import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

/**
 * Performance Monitor Decorator for individual methods
 * Tracks execution time and logs slow operations
 *
 * @param slowThresholdMs - Log warning if method takes longer than this (default: 1000ms)
 *
 * Usage:
 * @PerformanceMonitor(500) // Log if takes > 500ms
 * async someMethod() { ... }
 */
export function PerformanceMonitor(slowThresholdMs: number = 1000) {
  const injectLogger = Inject(WINSTON_MODULE_PROVIDER);

  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    // Inject logger into the class if not already present
    injectLogger(target, 'logger');

    descriptor.value = async function (...args: any[]) {
      const logger: Logger = this.logger;
      const className = target.constructor.name;
      const methodName = propertyKey;

      const startTime = performance.now();

      try {
        // Execute original method
        const result = await originalMethod.apply(this, args);

        const executionTime = (performance.now() - startTime).toFixed(2);

        // Log based on execution time
        if (parseFloat(executionTime) > slowThresholdMs) {
          logger.warn(`[${className}.${methodName}] SLOW: ${executionTime}ms`);
        } else {
          logger.debug(`[${className}.${methodName}] ${executionTime}ms`);
        }

        return result;
      } catch (error) {
        const executionTime = (performance.now() - startTime).toFixed(2);

        logger.error(
          `[${className}.${methodName}] FAILED after ${executionTime}ms: ${error.message}`,
        );

        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Class decorator to monitor all methods in a class
 * Tracks execution time for every method automatically
 *
 * @param slowThresholdMs - Log warning if method takes longer than this (default: 1000ms)
 *
 * Usage:
 * @MonitorClass(500)
 * @Injectable()
 * export class OrderService { ... }
 */
export function MonitorClass(slowThresholdMs: number = 1000) {
  const injectLogger = Inject(WINSTON_MODULE_PROVIDER);

  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    const className = constructor.name;

    // Inject logger into the class
    injectLogger(constructor.prototype, 'logger');

    // Get all method names
    const methodNames = Object.getOwnPropertyNames(constructor.prototype).filter(
      (name) => {
        const descriptor = Object.getOwnPropertyDescriptor(
          constructor.prototype,
          name,
        );
        return (
          descriptor &&
          typeof descriptor.value === 'function' &&
          name !== 'constructor'
        );
      },
    );

    // Wrap each method
    methodNames.forEach((methodName) => {
      const originalMethod = constructor.prototype[methodName];

      constructor.prototype[methodName] = function (...args: any[]) {
        const logger: Logger = this.logger;
        const startTime = performance.now();

        try {
          const result = originalMethod.apply(this, args);

          // Handle both sync and async methods
          if (result && typeof result.then === 'function') {
            return result
              .then((value: any) => {
                const executionTime = (performance.now() - startTime).toFixed(
                  2,
                );

                if (parseFloat(executionTime) > slowThresholdMs) {
                  logger.warn(
                    `[${className}.${methodName}] SLOW: ${executionTime}ms`,
                  );
                } else {
                  logger.debug(`[${className}.${methodName}] ${executionTime}ms`);
                }

                return value;
              })
              .catch((error: any) => {
                const executionTime = (performance.now() - startTime).toFixed(
                  2,
                );

                logger.error(
                  `[${className}.${methodName}] FAILED after ${executionTime}ms: ${error.message}`,
                );

                throw error;
              });
          } else {
            const executionTime = (performance.now() - startTime).toFixed(2);

            if (parseFloat(executionTime) > slowThresholdMs) {
              logger.warn(
                `[${className}.${methodName}] SLOW: ${executionTime}ms`,
              );
            } else {
              logger.debug(`[${className}.${methodName}] ${executionTime}ms`);
            }

            return result;
          }
        } catch (error) {
          const executionTime = (performance.now() - startTime).toFixed(2);

          logger.error(
            `[${className}.${methodName}] FAILED after ${executionTime}ms: ${error.message}`,
          );

          throw error;
        }
      };
    });

    return constructor;
  };
}

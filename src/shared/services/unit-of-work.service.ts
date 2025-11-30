import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../core/config/prisma/prisma.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Prisma } from '@prisma/client';
import * as crypto from 'crypto';

export interface TransactionOptions {
  maxWait?: number;
  timeout?: number;
  isolationLevel?:
    | 'ReadUncommitted'
    | 'ReadCommitted'
    | 'RepeatableRead'
    | 'Serializable';
}

type TransactionClient = Omit<
  PrismaService,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'
>;

@Injectable()
export class UnitOfWorkService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  /**
   * Execute a database transaction with automatic rollback on error
   * @param callback - Transaction callback with Prisma client
   * @param options - Transaction options (timeout, isolation level, etc.)
   * @returns Result of the transaction
   */
  async transaction<T>(
    callback: (prisma: TransactionClient) => Promise<T>,
    options?: TransactionOptions,
  ): Promise<T> {
    const transactionId = this.generateTransactionId();

    this.logger.debug('Transaction started', {
      transactionId,
      options,
      context: 'UnitOfWorkService',
    });

    const startTime = performance.now();

    try {
      const result = await this.prisma.$transaction(
        async (tx) => callback(tx as TransactionClient),
        options,
      );

      const executionTime = (performance.now() - startTime).toFixed(2);

      this.logger.debug('Transaction committed', {
        transactionId,
        executionTime: `${executionTime}ms`,
        context: 'UnitOfWorkService',
      });

      return result;
    } catch (error) {
      const executionTime = (performance.now() - startTime).toFixed(2);

      this.logger.error('Transaction failed and rolled back', {
        transactionId,
        executionTime: `${executionTime}ms`,
        error: error.message,
        code: error.code,
        context: 'UnitOfWorkService',
      });

      throw error;
    }
  }

  /**
   * Execute a transaction with automatic retry on retryable errors
   * @param callback - Transaction callback
   * @param maxRetries - Maximum number of retry attempts (default: 3)
   * @param options - Transaction options
   * @returns Result of the transaction
   */
  async executeWithRetry<T>(
    callback: (prisma: TransactionClient) => Promise<T>,
    maxRetries = 3,
    options?: TransactionOptions,
  ): Promise<T> {
    const transactionId = this.generateTransactionId();

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.transaction(callback, options);
      } catch (error) {
        const isRetryable = this.isRetryableError(error);
        const isLastAttempt = attempt === maxRetries;

        if (isLastAttempt || !isRetryable) {
          this.logger.error('Transaction failed after retries', {
            transactionId,
            attempt,
            maxRetries,
            isRetryable,
            error: error.message,
            code: error.code,
            context: 'UnitOfWorkService',
          });
          throw error;
        }

        const delayMs = this.calculateBackoff(attempt);

        this.logger.warn('Transaction retry scheduled', {
          transactionId,
          attempt,
          maxRetries,
          delayMs,
          error: error.message,
          code: error.code,
          context: 'UnitOfWorkService',
        });

        await this.delay(delayMs);
      }
    }

    throw new Error('Max retries exceeded');
  }

  /**
   * Check if error is retryable (deadlocks, timeouts, connection issues)
   */
  private isRetryableError(error: any): boolean {
    if (!error.code) return false;

    const retryableCodes = [
      'P2034', // Transaction conflict / write conflict
      'P2024', // Timed out fetching a new connection from the connection pool
      'P1008', // Operations timed out
      'P1001', // Can't reach database server
      'P1002', // Database server connection timed out
      'P1017', // Server has closed the connection
    ];

    // Also check for deadlock in message
    const isDeadlock =
      error.message &&
      (error.message.includes('deadlock') ||
        error.message.includes('Deadlock'));

    return retryableCodes.includes(error.code) || isDeadlock;
  }

  /**
   * Calculate exponential backoff delay with jitter
   */
  private calculateBackoff(attempt: number): number {
    // Exponential backoff: 2^attempt * 100ms, max 2000ms
    const exponentialDelay = Math.min(2000, Math.pow(2, attempt) * 100);

    // Add jitter (±25%) to prevent thundering herd
    const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5);

    return Math.floor(exponentialDelay + jitter);
  }

  /**
   * Generate unique transaction ID for tracing
   */
  private generateTransactionId(): string {
    return `txn_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

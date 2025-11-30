import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

/**
 * Service for generating and managing unique request trace IDs
 * Trace IDs help track requests through the application for debugging and monitoring
 */
@Injectable()
export class TraceIdService {
  /**
   * Generate a unique trace ID
   * @returns UUID v4 string
   */
  generate(): string {
    return randomUUID();
  }

  /**
   * Extract or generate trace ID from request headers
   * Checks for X-Trace-Id header first, generates new one if not present
   * @param headers - Request headers
   * @returns Trace ID string
   */
  getOrGenerate(headers: Record<string, any>): string {
    const existingTraceId = headers['x-trace-id'] || headers['X-Trace-Id'];
    return existingTraceId || this.generate();
  }
}

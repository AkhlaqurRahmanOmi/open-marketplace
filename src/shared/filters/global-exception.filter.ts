import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { TraceIdService } from '../services/trace-id.service';
import { ApiErrorResponse } from '../types/api-response.interface';
import { ValidationError } from '../types/validation-error.interface';

/**
 * Global exception filter to standardize error responses
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly traceIdService: TraceIdService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Get or generate trace ID
    const traceId = this.traceIdService.getOrGenerate(request.headers);

    // Get API version
    const version = this.getApiVersion(request);

    let statusCode: number;
    let errorCode: string;
    let message: string;
    let details: ValidationError[] | string | undefined;
    let hint: string | undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as any;

        // Handle validation errors from class-validator
        if (responseObj.message && Array.isArray(responseObj.message)) {
          errorCode = 'VALIDATION_ERROR';
          message = 'Validation failed';
          details = this.formatValidationErrors(responseObj.message);
          hint = 'Please check the request body and ensure all required fields are provided with valid values';
        } else {
          errorCode = this.getErrorCode(statusCode);
          message = responseObj.message || exception.message;
          details = responseObj.details;
          hint = responseObj.hint;
        }
      } else {
        errorCode = this.getErrorCode(statusCode);
        message = exceptionResponse.toString();
      }
    } else if (exception instanceof Error) {
      // Handle unexpected errors
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      errorCode = 'INTERNAL_SERVER_ERROR';
      message = 'An unexpected error occurred';
      details = process.env.NODE_ENV === 'development' ? exception.message : undefined;
      hint = 'Please try again later or contact support if the problem persists';

      // Log the full error for debugging
      this.logger.error(
        `Unexpected error: ${exception.message}`,
        exception.stack,
        { traceId, path: request.path },
      );
    } else {
      // Handle unknown errors
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      errorCode = 'UNKNOWN_ERROR';
      message = 'An unknown error occurred';
      hint = 'Please try again later or contact support if the problem persists';

      this.logger.error('Unknown error occurred', JSON.stringify(exception), {
        traceId,
        path: request.path,
      });
    }

    // Build error response
    const errorResponse: ApiErrorResponse = {
      success: false,
      statusCode,
      error: {
        code: errorCode,
        message,
        ...(details && { details }),
        ...(hint && { hint }),
      },
      meta: {
        timestamp: new Date().toISOString(),
        traceId,
        version,
      },
      links: {
        self: `${request.protocol}://${request.get('host')}${request.path}`,
        documentation: `${request.protocol}://${request.get('host')}/api/docs`,
      },
    };

    // Log error for non-client errors
    if (statusCode >= 500) {
      this.logger.error(
        `Error ${statusCode}: ${message}`,
        { traceId, path: request.path, errorCode },
      );
    } else if (statusCode >= 400) {
      this.logger.warn(
        `Client error ${statusCode}: ${message}`,
        { traceId, path: request.path, errorCode },
      );
    }

    response.status(statusCode).json(errorResponse);
  }

  /**
   * Get API version from request path
   */
  private getApiVersion(request: Request): string {
    const path = request.path;
    const versionMatch = path.match(/\/v(\d+)\//);
    return versionMatch ? versionMatch[1] : '1';
  }

  /**
   * Get error code based on HTTP status code
   */
  private getErrorCode(statusCode: number): string {
    const errorCodes: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
      504: 'GATEWAY_TIMEOUT',
    };

    return errorCodes[statusCode] || `HTTP_${statusCode}`;
  }

  /**
   * Format validation errors from class-validator
   */
  private formatValidationErrors(errors: any[]): ValidationError[] {
    return errors.map((error) => {
      // Handle string errors
      if (typeof error === 'string') {
        return {
          field: 'unknown',
          message: error,
        };
      }

      // Handle class-validator error objects
      if (error.property && error.constraints) {
        const constraintKey = Object.keys(error.constraints)[0];
        return {
          field: error.property,
          message: error.constraints[constraintKey],
          constraint: constraintKey,
          value: error.value,
        };
      }

      // Handle nested errors
      if (error.children && error.children.length > 0) {
        return this.formatValidationErrors(error.children)[0];
      }

      // Fallback
      return {
        field: error.property || 'unknown',
        message: error.message || 'Validation failed',
      };
    });
  }
}

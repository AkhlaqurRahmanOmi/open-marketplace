import { HATEOASLinks } from './hateoas.interface';
import { PaginationMeta } from './pagination.interface';
import { ValidationError } from './validation-error.interface';

/**
 * Standard successful API response structure
 * @template T - Type of the data being returned
 */
export interface ApiResponse<T> {
  /** Indicates successful response */
  success: true;
  /** HTTP status code */
  statusCode: number;
  /** Human-readable message */
  message: string;
  /** Response data */
  data: T;
  /** Response metadata */
  meta: {
    /** ISO timestamp of the response */
    timestamp: string;
    /** Unique request identifier for tracing */
    traceId: string;
    /** API version */
    version: string;
    /** Pagination metadata (only for paginated responses) */
    pagination?: PaginationMeta;
  };
  /** HATEOAS links for resource navigation */
  links: HATEOASLinks;
}

/**
 * Standard error API response structure
 */
export interface ApiErrorResponse {
  /** Indicates error response */
  success: false;
  /** HTTP status code */
  statusCode: number;
  /** Error details */
  error: {
    /** Error code (e.g., 'VALIDATION_ERROR', 'NOT_FOUND') */
    code: string;
    /** Human-readable error message */
    message: string;
    /** Detailed error information (validation errors or additional context) */
    details?: ValidationError[] | string;
    /** Helpful hint for resolving the error */
    hint?: string;
  };
  /** Response metadata */
  meta: {
    /** ISO timestamp of the error */
    timestamp: string;
    /** Unique request identifier for tracing */
    traceId: string;
    /** API version */
    version: string;
  };
  /** HATEOAS links */
  links: {
    /** Link to the current endpoint */
    self: string;
    /** Link to API documentation */
    documentation?: string;
  };
}

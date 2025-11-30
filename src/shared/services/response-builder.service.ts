import { Injectable } from '@nestjs/common';
import { ApiResponse } from '../types/api-response.interface';
import { HATEOASLinks } from '../types/hateoas.interface';
import { PaginationMeta } from '../types';

/**
 * Service for building standardized API responses with HATEOAS links
 */
@Injectable()
export class ResponseBuilderService {
  /**
   * Build a successful API response
   * @param data - Response data
   * @param message - Success message
   * @param statusCode - HTTP status code
   * @param traceId - Request trace ID
   * @param version - API version
   * @param links - HATEOAS links
   * @param pagination - Optional pagination metadata
   * @returns Standardized API response
   */
  buildSuccess<T>(
    data: T,
    message: string,
    statusCode: number,
    traceId: string,
    version: string,
    links: HATEOASLinks,
    pagination?: PaginationMeta,
  ): ApiResponse<T> {
    const response: ApiResponse<T> = {
      success: true,
      statusCode,
      message,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        traceId,
        version,
      },
      links,
    };

    // Add pagination metadata if provided
    if (pagination) {
      response.meta.pagination = pagination;
    }

    return response;
  }

  /**
   * Build HATEOAS links for a resource
   * @param baseUrl - Base URL of the current endpoint
   * @param resourceId - Optional resource ID
   * @param relatedLinks - Optional related resource links
   * @param paginationLinks - Optional pagination links
   * @returns HATEOAS links object
   */
  buildLinks(
    baseUrl: string,
    resourceId?: string | number,
    relatedLinks?: HATEOASLinks['related'],
    paginationLinks?: HATEOASLinks['pagination'],
  ): HATEOASLinks {
    const selfUrl = resourceId ? `${baseUrl}/${resourceId}` : baseUrl;

    return {
      self: selfUrl,
      ...(relatedLinks && { related: relatedLinks }),
      ...(paginationLinks && { pagination: paginationLinks }),
    };
  }

  /**
   * Build pagination links for paginated responses
   * @param baseUrl - Base URL of the endpoint
   * @param currentPage - Current page number
   * @param totalPages - Total number of pages
   * @param queryParams - Additional query parameters
   * @returns Pagination links
   */
  buildPaginationLinks(
    baseUrl: string,
    currentPage: number,
    totalPages: number,
    queryParams?: Record<string, any>,
  ): HATEOASLinks['pagination'] {
    const buildUrl = (page: number) => {
      const params = new URLSearchParams({
        ...queryParams,
        page: page.toString(),
      });
      return `${baseUrl}?${params.toString()}`;
    };

    return {
      first: buildUrl(1),
      last: buildUrl(totalPages),
      ...(currentPage < totalPages && { next: buildUrl(currentPage + 1) }),
      ...(currentPage > 1 && { prev: buildUrl(currentPage - 1) }),
    };
  }
}

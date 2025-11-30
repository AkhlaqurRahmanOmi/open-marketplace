import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';
import { EXCLUDE_GLOBAL_RESPONSE_KEY } from '../decorators/exclude-global-response.decorator';
import { RELATED_LINKS_KEY } from '../decorators/related-links.decorator';
import { TraceIdService } from '../services/trace-id.service';
import { ResponseBuilderService } from '../services/response-builder.service';
import { HATEOASLinks } from '../types/hateoas.interface';
import { PaginatedResult } from '../types';
import { RelatedLinksConfig } from '../types/related-links-config.interface';

/**
 * Global interceptor to format all API responses with standardized structure and HATEOAS links
 */
@Injectable()
export class GlobalResponseInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly traceIdService: TraceIdService,
    private readonly responseBuilder: ResponseBuilderService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Check if endpoint should be excluded from global response formatting
    const excludeGlobalResponse = this.reflector.getAllAndOverride<boolean>(
      EXCLUDE_GLOBAL_RESPONSE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (excludeGlobalResponse) {
      return next.handle();
    }

    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse();

    // Get or generate trace ID
    const traceId = request['traceId'] || this.traceIdService.getOrGenerate(request.headers);

    // Get API version from request or default to '1'
    const version = this.getApiVersion(request);

    // Get base URL for HATEOAS links
    const baseUrl = this.getBaseUrl(request);

    return next.handle().pipe(
      map((data) => {
        // If data is already formatted as ApiResponse, return as-is
        if (data && data.success !== undefined && data.meta && data.links) {
          return data;
        }

        // Check if response is paginated
        const isPaginated = this.isPaginatedResponse(data);

        let formattedData: any;
        let paginationMeta: any;
        let links: HATEOASLinks;

        if (isPaginated) {
          // Extract pagination data
          const paginatedResult = data as PaginatedResult<any>;
          formattedData = paginatedResult.data;
          paginationMeta = paginatedResult.pagination;

          // Build pagination links
          const paginationLinks = this.responseBuilder.buildPaginationLinks(
            baseUrl,
            paginationMeta.currentPage,
            paginationMeta.totalPages,
            request.query,
          );

          links = this.responseBuilder.buildLinks(
            baseUrl,
            undefined,
            this.buildRelatedLinks(request, formattedData, context),
            paginationLinks,
          );
        } else {
          formattedData = data;
          links = this.responseBuilder.buildLinks(
            baseUrl,
            this.getResourceId(request, data),
            this.buildRelatedLinks(request, data, context),
          );
        }

        // Build standardized response
        return this.responseBuilder.buildSuccess(
          formattedData,
          this.getSuccessMessage(request),
          response.statusCode,
          traceId,
          version,
          links,
          paginationMeta,
        );
      }),
    );
  }

  /**
   * Check if response data is paginated
   */
  private isPaginatedResponse(data: any): boolean {
    return (
      data &&
      typeof data === 'object' &&
      'data' in data &&
      'pagination' in data &&
      data.pagination &&
      'currentPage' in data.pagination
    );
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
   * Build base URL for the current endpoint
   */
  private getBaseUrl(request: Request): string {
    const protocol = request.protocol;
    const host = request.get('host');
    const path = request.path;

    return `${protocol}://${host}${path}`;
  }

  /**
   * Get resource ID from request or data
   */
  private getResourceId(request: Request, data: any): string | number | undefined {
    // Try to get ID from route params first
    const params = request.params as any;
    if (params.id) {
      return params.id;
    }

    // Try to get ID from response data
    if (data && typeof data === 'object' && 'id' in data) {
      return data.id;
    }

    return undefined;
  }

  /**
   * Build related resource links based on the endpoint
   * First checks for @RelatedLinks decorator, then falls back to default behavior
   */
  private buildRelatedLinks(
    request: Request,
    data: any,
    context: ExecutionContext,
  ): HATEOASLinks['related'] {
    const related: HATEOASLinks['related'] = {};
    const path = request.path;
    const resourceId = this.getResourceId(request, data);
    const protocol = request.protocol;
    const host = request.get('host');

    // Check if endpoint has @RelatedLinks decorator
    const relatedLinksConfig = this.reflector.get<RelatedLinksConfig>(
      RELATED_LINKS_KEY,
      context.getHandler(),
    );

    if (relatedLinksConfig) {
      // Build links from decorator configuration
      for (const [linkName, config] of Object.entries(relatedLinksConfig)) {
        // Replace {id} placeholder with actual resource ID if available
        let linkPath = config.path;
        if (resourceId && linkPath.includes('{id}')) {
          linkPath = linkPath.replace('{id}', resourceId.toString());
        }

        // Build full URL
        const fullUrl = linkPath.startsWith('http')
          ? linkPath
          : `${protocol}://${host}${linkPath}`;

        related[linkName] = {
          href: fullUrl,
          method: config.method,
          rel: config.rel || linkName,
          ...(config.type && { type: config.type }),
          ...(config.description && { description: config.description }),
        };
      }

      return Object.keys(related).length > 0 ? related : undefined;
    }

    // Fallback: Default behavior for standard CRUD operations

    // Add create link for collection endpoints (GET without ID)
    if (request.method === 'GET' && !resourceId) {
      related.create = {
        href: this.getBaseUrl(request),
        method: 'POST',
        rel: 'create',
        type: 'application/json',
      };
    }

    // Add update and delete links for single resource endpoints
    if (resourceId) {
      // Build proper resource URL
      // For POST requests (like /user/register), construct the resource URL
      // For other requests with ID in path, use current URL
      let resourceUrl: string;

      if (request.method === 'POST') {
        // Extract base path (remove action like /register)
        // e.g., /api/v1/user/register -> /api/v1/user
        const basePath = path.replace(/\/(register|create|sign-in|refresh-tokens)$/, '');
        resourceUrl = `${protocol}://${host}${basePath}/${resourceId}`;
      } else {
        resourceUrl = this.getBaseUrl(request);
      }

      related.update = {
        href: resourceUrl,
        method: 'PUT',
        rel: 'update',
        type: 'application/json',
      };

      related.patch = {
        href: resourceUrl,
        method: 'PATCH',
        rel: 'patch',
        type: 'application/json',
      };

      related.delete = {
        href: resourceUrl,
        method: 'DELETE',
        rel: 'delete',
      };
    }

    return Object.keys(related).length > 0 ? related : undefined;
  }

  /**
   * Get success message based on HTTP method
   */
  private getSuccessMessage(request: Request): string {
    const method = request.method;
    const messages: Record<string, string> = {
      GET: 'Resource retrieved successfully',
      POST: 'Resource created successfully',
      PUT: 'Resource updated successfully',
      PATCH: 'Resource updated successfully',
      DELETE: 'Resource deleted successfully',
    };

    return messages[method] || 'Request processed successfully';
  }
}

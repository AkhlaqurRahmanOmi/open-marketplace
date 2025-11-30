/**
 * HATEOAS (Hypermedia as the Engine of Application State) interfaces
 * These interfaces define the structure for hypermedia links in REST API responses
 */

/**
 * Represents a single hypermedia link
 */
export interface HATEOASLink {
  /** The URL of the link */
  href: string;
  /** HTTP method to use (GET, POST, PUT, DELETE, PATCH) */
  method: string;
  /** Relationship type (e.g., 'create', 'update', 'delete') */
  rel: string;
  /** Optional content type (e.g., 'application/json') */
  type?: string;
}

/**
 * Collection of HATEOAS links for a resource
 */
export interface HATEOASLinks {
  /** Link to the current resource */
  self: string;
  /** Related resource links */
  related?: {
    [key: string]: HATEOASLink;
  };
  /** Pagination links */
  pagination?: {
    first?: string;
    last?: string;
    next?: string;
    prev?: string;
  };
}

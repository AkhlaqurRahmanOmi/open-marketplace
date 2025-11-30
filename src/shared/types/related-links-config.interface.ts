/**
 * Configuration for a single related link
 */
export interface RelatedLinkConfig {
  /** The path/endpoint for the link (can include {id} placeholder) */
  path: string;

  /** HTTP method */
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

  /** Content type (optional) */
  type?: string;

  /** Human-readable description (optional) */
  description?: string;

  /** Relationship type (optional, defaults to the key name) */
  rel?: string;
}

/**
 * Map of related links for an endpoint
 * Key is the link name (e.g., 'profile', 'logout', 'update')
 */
export interface RelatedLinksConfig {
  [linkName: string]: RelatedLinkConfig;
}

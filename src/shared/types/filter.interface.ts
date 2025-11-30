/**
 * Generic filter options for queries
 */
export interface FilterOptions {
  [key: string]: any;
}

/**
 * Sorting options
 */
export interface SortOptions {
  field: string;
  order: 'asc' | 'desc';
}

/**
 * Search options
 */
export interface SearchOptions {
  query: string;
  fields: string[];
}

/**
 * Query options combining filtering, sorting, pagination, and search
 */
export interface QueryOptions {
  filters?: FilterOptions;
  sort?: SortOptions;
  pagination?: {
    page: number;
    limit: number;
  };
  search?: SearchOptions;
  fields?: string[];
  priceRange?: {
    min?: number;
    max?: number;
  };
  minRating?: number;
}

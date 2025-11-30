import { FilterOptions, PaginatedResult, QueryOptions } from '../types';

export abstract class BaseRepository<T, ID = string> {
  abstract findById(id: ID): Promise<T | null>;
  abstract findAll(): Promise<T[]>;
  abstract create(data: Partial<T>): Promise<T>;
  abstract update(id: ID, data: Partial<T>): Promise<T>;
  abstract delete(id: ID): Promise<void>;

  // Advanced features for complex filtering and search
  abstract findWithFilters(options: QueryOptions): Promise<PaginatedResult<T>>;
  abstract search(query: string, fields: string[]): Promise<T[]>;
  abstract countTotal(filters?: FilterOptions): Promise<number>;
}

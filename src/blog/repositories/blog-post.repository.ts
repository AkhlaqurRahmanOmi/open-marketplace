import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/config/prisma/prisma.service';
import { BlogPost, BlogPostStatus, Prisma } from '@prisma/client';
import { FilterOptions, PaginatedResult, QueryOptions } from '../../shared/types';
import { BaseRepository } from '../../shared/repository/base.repository';

@Injectable()
export class BlogPostRepository extends BaseRepository<BlogPost, number> {
  constructor(private prisma: PrismaService) {
    super();
  }

  async create(data: Partial<BlogPost>): Promise<BlogPost> {
    return this.prisma.blogPost.create({
      data: data as Prisma.BlogPostCreateInput,
    });
  }

  async findById(id: number): Promise<BlogPost | null> {
    return this.prisma.blogPost.findUnique({ where: { id } });
  }

  async findAll(): Promise<BlogPost[]> {
    return this.prisma.blogPost.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async update(id: number, data: Partial<BlogPost>): Promise<BlogPost> {
    return this.prisma.blogPost.update({
      where: { id },
      data: data as Prisma.BlogPostUpdateInput,
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.blogPost.delete({ where: { id } });
  }

  async findWithFilters(options: QueryOptions): Promise<PaginatedResult<BlogPost>> {
    const { filters, sort, pagination, search, fields } = options || {};

    // Build where clause
    let where: Prisma.BlogPostWhereInput = { ...(filters as Prisma.BlogPostWhereInput) };

    if (search?.query && (fields?.length || search.fields?.length)) {
      const targetFields = fields?.length ? fields : search.fields;
      const orClauses = (targetFields || []).map((f) => ({
        [f]: { contains: search.query, mode: 'insensitive' },
      })) as unknown as Prisma.BlogPostWhereInput[];

      where = {
        AND: [where],
        OR: orClauses,
      } as Prisma.BlogPostWhereInput;
    }

    const orderBy = sort?.field
      ? ({ [sort.field]: sort.order ?? 'asc' } as Prisma.BlogPostOrderByWithRelationInput)
      : ({ createdAt: 'desc' } as Prisma.BlogPostOrderByWithRelationInput);

    const page = Math.max(1, pagination?.page ?? 1);
    const limit = Math.max(1, Math.min(100, pagination?.limit ?? 10));
    const skip = (page - 1) * limit;
    const take = limit;

    const [totalItems, data] = await this.prisma.$transaction([
      this.prisma.blogPost.count({ where }),
      this.prisma.blogPost.findMany({ where, orderBy, skip, take }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalItems / limit));

    return {
      data,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async search(query: string, fields: string[]): Promise<BlogPost[]> {
    if (!query || !fields?.length) return [];

    const orClauses = fields.map((f) => ({
      [f]: { contains: query, mode: 'insensitive' },
    })) as unknown as Prisma.BlogPostWhereInput[];

    return this.prisma.blogPost.findMany({
      where: { OR: orClauses },
      orderBy: { createdAt: 'desc' },
    });
  }

  async countTotal(filters?: FilterOptions): Promise<number> {
    return this.prisma.blogPost.count({ where: filters as Prisma.BlogPostWhereInput });
  }

  async findMany(where?: Prisma.BlogPostWhereInput): Promise<BlogPost[]> {
    return this.prisma.blogPost.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findBySlug(slug: string): Promise<BlogPost | null> {
    return this.prisma.blogPost.findUnique({ where: { slug } });
  }

  async findPublished(): Promise<BlogPost[]> {
    return this.findMany({
      status: BlogPostStatus.published,
      publishedAt: { lte: new Date() },
    });
  }
}

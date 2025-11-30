import { Injectable, NotFoundException } from '@nestjs/common';
import { BlogPost, BlogPostStatus } from '@prisma/client';
import { BlogPostRepository } from './repositories/blog-post.repository';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { BlogPostQueryDto } from './dto/update-blog-post.dto';
import { PaginatedResult, QueryOptions } from 'src/shared/types';

// Define a simple pagination and sort interface local to service
interface ListParams extends BlogPostQueryDto {
  page?: number;
  limit?: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class BlogService {
  constructor(private readonly blogRepo: BlogPostRepository) {}

  // Basic slugify: lowercases, trims, replaces non-alphanumerics with '-', collapses dashes
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/['"]/g, '')
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');
  }

  // Ensure slug uniqueness by appending -1, -2, ... if needed
  private async generateUniqueSlug(title: string): Promise<string> {
    const base = this.slugify(title);
    let candidate = base;
    let suffix = 1;

    // check existence via repository
    // Loop capped as safety (practically won't hit this)
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const exists = await this.blogRepo.findBySlug(candidate);
      if (!exists) return candidate;
      candidate = `${base}-${suffix++}`;
    }
  }

  async create(dto: CreateBlogPostDto): Promise<BlogPost> {
    const now = new Date();

    // Always generate slug from title (ignore incoming dto.slug if any)
    const slug = await this.generateUniqueSlug(dto.title);

    const data: Partial<BlogPost> = {
      title: dto.title,
      slug,
      content: dto.content,
      excerpt: dto.excerpt,
      status: dto.status ?? BlogPostStatus.draft,
      image: dto.image,
      publishedAt:
        dto.status === BlogPostStatus.published ? (dto as any)['publishedAt'] ?? now : undefined,
      createdAt: now,
      updatedAt: now,
    } as Partial<BlogPost>;

    return this.blogRepo.create(data);
  }

  async findAll(params: ListParams = {}): Promise<PaginatedResult<BlogPost>> {
    const { status, search, page = 1, limit = 10, sortField, sortOrder } = params;

    const options: QueryOptions = {
      filters: {
        ...(status ? { status } : {}),
      },
      search: search
        ? {
            query: search,
            fields: ['title', 'slug', 'content', 'excerpt'],
          }
        : undefined,
      sort: sortField
        ? { field: sortField, order: (sortOrder ?? 'desc') as 'asc' | 'desc' }
        : { field: 'createdAt', order: 'desc' },
      pagination: { page, limit },
    };

    return this.blogRepo.findWithFilters(options);
  }

  async findPublished(params: { page?: number; limit?: number } = {}): Promise<PaginatedResult<BlogPost>> {
    const { page = 1, limit = 10 } = params;

    const options: QueryOptions = {
      filters: {
        status: BlogPostStatus.published,
        publishedAt: { lte: new Date() } as any, // Prisma specific filter handled in repository
      } as any,
      sort: { field: 'publishedAt', order: 'desc' },
      pagination: { page, limit },
    };

    return this.blogRepo.findWithFilters(options);
  }

  async findBySlug(slug: string): Promise<BlogPost | null> {
    return this.blogRepo.findBySlug(slug);
  }

  async findById(id: number): Promise<BlogPost> {
    const post = await this.blogRepo.findById(id);
    if (!post) throw new NotFoundException('Blog post not found');
    return post;
  }

  async update(id: number, dto: Partial<CreateBlogPostDto>): Promise<BlogPost> {
    const existing = await this.findById(id);

    const now = new Date();
    const willBePublished = dto.status === BlogPostStatus.published;

    // Keep existing slug; if you also want to auto-update slug on title change, we can add that
    const data: Partial<BlogPost> = {
      ...dto,
      slug: existing.slug,
      publishedAt:
        willBePublished && !existing.publishedAt ? (dto as any)?.publishedAt ?? now : existing.publishedAt,
      updatedAt: now,
    } as Partial<BlogPost>;

    return this.blogRepo.update(id, data);
  }

  async remove(id: number): Promise<void> {
    await this.blogRepo.delete(id);
  }

  async publish(id: number, publishedAt?: Date): Promise<BlogPost> {
    await this.findById(id);
    return this.blogRepo.update(id, {
      status: BlogPostStatus.published,
      publishedAt: publishedAt ?? new Date(),
      updatedAt: new Date(),
    });
  }

  async unpublish(id: number): Promise<BlogPost> {
    await this.findById(id);
    return this.blogRepo.update(id, {
      status: BlogPostStatus.draft,
      updatedAt: new Date(),
    });
  }
}

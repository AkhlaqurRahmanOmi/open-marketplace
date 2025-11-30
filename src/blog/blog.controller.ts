import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { BlogService } from './blog.service';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { BlogPost } from '@prisma/client';
import { Auth } from '../auth/decorator/auth.decorator';
import { AuthType } from '../auth/enums/auth-type.enum';
import { Permissions } from '../auth/decorator/permissions.decorator';

// @Auth(AuthType.Bearer)
@Controller('blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  // @Roles('Admin')
  @Permissions('blog:create')
  @Post()
  create(@Body() dto: CreateBlogPostDto): Promise<BlogPost> {
    return this.blogService.create(dto);
  }

  // @Roles('Admin')
  @Auth(AuthType.None)
  @Permissions('blog:view')
  @Get()
  list(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('sortField') sortField?: string,
    @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    return this.blogService.findAll({
      status: status as any,
      search,
      page: Number(page),
      limit: Number(limit),
      sortField,
      sortOrder,
    });
  }

  // @Roles('Admin','Customer')
  @Auth(AuthType.None)
  @Permissions('blog:view')
  @Get('published')
  listPublished(@Query('page') page = '1', @Query('limit') limit = '10') {
    return this.blogService.findPublished({
      page: Number(page),
      limit: Number(limit),
    });
  }

  @Auth(AuthType.None)
  @Permissions('blog:view')
  @Get('slug/:slug')
  getBySlug(@Param('slug') slug: string) {
    return this.blogService.findBySlug(slug);
  }

  @Auth(AuthType.None)
  @Permissions('blog:view')
  @Get(':id')
  getById(@Param('id') id: string) {
    return this.blogService.findById(Number(id));
  }


  @Permissions('blog:update')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateBlogPostDto>) {
    return this.blogService.update(Number(id), dto);
  }

  @Permissions('blog:delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.blogService.remove(Number(id));
  }

  @Permissions('blog:publish')
  @Post(':id/publish')
  publish(@Param('id') id: string, @Body('publishedAt') publishedAt?: string) {
    return this.blogService.publish(
      Number(id),
      publishedAt ? new Date(publishedAt) : undefined,
    );
  }

  @Permissions('blog:publish')
  @Post(':id/unpublish')
  unpublish(@Param('id') id: string) {
    return this.blogService.unpublish(Number(id));
  }
}

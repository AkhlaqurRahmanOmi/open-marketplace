import { Module } from '@nestjs/common';
import { BlogController } from './blog.controller';
import { BlogService } from './blog.service';
import { BlogPostRepository } from './repositories/blog-post.repository';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [SharedModule],
  controllers: [BlogController],
  providers: [BlogService, BlogPostRepository],
  exports: [BlogService]
})
export class BlogModule {}

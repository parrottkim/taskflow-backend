import { Module } from '@nestjs/common';
import { BookmarkController } from './bookmark.controller';
import { BookmarkService } from './bookmark.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bookmark } from '@/entity/bookmark/bookmark.entity';
import { User } from '@/entity/user/user.entity';
import { Project } from '@/entity/project/project.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Bookmark, User, Project])],
  providers: [BookmarkService],
  controllers: [BookmarkController],
})
export class BookmarkModule {}

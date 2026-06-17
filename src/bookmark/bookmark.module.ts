import { forwardRef, Module } from '@nestjs/common';
import { BookmarkController } from './bookmark.controller';
import { BookmarkService } from './bookmark.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bookmark } from '@/entity/bookmark/bookmark.entity';
import { User } from '@/entity/user/user.entity';
import { Project } from '@/entity/project/project.entity';
import { ProjectClientModule } from '@/project/project-client.module';
import { ProjectModule } from '@/project/project.module';
import { UserModule } from '@/user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Bookmark, User, Project]),
    ProjectClientModule,
    UserModule,
  ],
  providers: [BookmarkService],
  controllers: [BookmarkController],
  exports: [BookmarkService],
})
export class BookmarkModule {}

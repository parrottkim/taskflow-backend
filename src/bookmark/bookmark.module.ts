import { forwardRef, Module } from '@nestjs/common';
import { BookmarkController } from './bookmark.controller';
import { BookmarkService } from './bookmark.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bookmark } from 'src/entity/bookmark/bookmark.entity';
import { User } from 'src/entity/user/user.entity';
import { Project } from 'src/entity/project/project.entity';
import { ProjectClientModule } from 'src/project/project-client.module';
import { ProjectModule } from 'src/project/project.module';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Bookmark, User, Project]),
    forwardRef(() => ProjectModule),
    ProjectClientModule,
    UserModule,
  ],
  providers: [BookmarkService],
  controllers: [BookmarkController],
  exports: [BookmarkService],
})
export class BookmarkModule {}

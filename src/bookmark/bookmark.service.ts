import {
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { Bookmark } from '@/entity/bookmark/bookmark.entity';
import { Project } from '@/entity/project/project.entity';
import { User } from '@/entity/user/user.entity';
import { ProjectService } from '@/project/project.service';
import { Repository } from 'typeorm';
import { BookmarkDto } from './dto/bookmark';
import { assertWriteAccess } from '@/common/policies/write-access.policy';

@Injectable()
export class BookmarkService {
  constructor(
    @InjectRepository(Bookmark)
    private readonly bookmarkRepository: Repository<Bookmark>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  async create(user: User, project: Project) {
    const bookmark = await this.bookmarkRepository.create({ user, project });
    return await this.bookmarkRepository.save(bookmark);
  }

  async remove(bookmark: Bookmark) {
    return await this.bookmarkRepository.remove(bookmark);
  }

  async findBookmarkById(userId: number, projectId: number) {
    return await this.bookmarkRepository
      .createQueryBuilder('bookmark')
      .leftJoinAndSelect('bookmark.user', 'user')
      .leftJoinAndSelect('bookmark.project', 'project')
      .where('user.id = :userId', { userId })
      .andWhere('project.id = :projectId', { projectId })
      .getOne();
  }

  async addBookmark(user: User, id: number) {
    assertWriteAccess(user);
    const project = await this.projectRepository.findOne({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException('not_found_project');
    }

    const bookmark = await this.findBookmarkById(user.id, id);

    if (bookmark) {
      throw new ConflictException('conflict_bookmark_already_exists');
    }

    const newBookmark = await this.create(user, project);

    return plainToInstance(BookmarkDto, {
      userId: newBookmark.user.id,
      projectId: newBookmark.project.id,
      createdAt: newBookmark.createdAt,
    });
  }

  async removeBookmark(user: User, id: number) {
    assertWriteAccess(user);
    const bookmark = await this.findBookmarkById(user.id, id);

    if (!bookmark) {
      throw new NotFoundException('not_found_bookmark');
    }

    await this.remove(bookmark);

    return plainToInstance(BookmarkDto, {
      userId: bookmark.user.id,
      projectId: bookmark.project.id,
      createdAt: bookmark.createdAt,
    });
  }
}

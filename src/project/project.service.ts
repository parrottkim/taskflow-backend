import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { Project } from 'src/entity/project/project.entity';
import { Brackets, DataSource, Repository } from 'typeorm';
import { ProjectDto, ProjectListDto } from './dto/project';
import { ProjectClientService } from './project-client.service';
import { ProjectClientDto } from './dto/project-client';
import { UserService } from 'src/user/user.service';
import { ProjectStatsDto, ProjectStatsListDto } from './dto/project-stats';
import * as moment from 'moment';
import { GetProjectsDto } from './dto/get-projects';
import { GetProjectStatsDto } from './dto/get-project-stats';
import { GetProjectSummaryDto } from './dto/get-project-summary';
import { ProjectSummaryDto } from './dto/project-summary';
import { User } from 'src/entity/user/user.entity';
import { CreateProjectDto } from './dto/create-project';
import { UpdateProjectDto } from './dto/update-project';
import { IssueCategory } from 'src/entity/issue/issue-category.entity';
import { ProjectClient } from 'src/entity/project/project-client.entity';

@Injectable()
export class ProjectService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly userService: UserService,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    private readonly projectClientService: ProjectClientService,
  ) {}

  async findProjectWithManagerId(id: number, start?: string, end?: string) {
    let queryBuilder = await this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.manager', 'manager')
      .leftJoinAndSelect('project.latestCategory', 'latestCategory')
      .leftJoinAndSelect('latestCategory.charge', 'charge')
      .leftJoinAndSelect('manager.position', 'position')
      .leftJoinAndSelect('manager.department', 'department')
      .leftJoinAndSelect('project.client', 'client')
      .where('manager.id = :id', { id });

    if (start) {
      queryBuilder.andWhere('project.createdAt >= :start', {
        start: `${moment(start).format('YYYY-MM-DD')} 00:00:00`,
      });
    }
    if (end) {
      queryBuilder.andWhere('project.createdAt <= :end', {
        end: `${moment(end).format('YYYY-MM-DD')} 23:59:59`,
      });
    }

    return queryBuilder.getManyAndCount();
  }

  async findAllProjectCount(value: GetProjectSummaryDto) {
    let queryBuilder = await this.projectRepository
      .createQueryBuilder('project')
      .leftJoin('project.issues', 'issue');

    if (value.start) {
      queryBuilder.andWhere('project.createdAt >= :start', {
        start: `${moment(value.start).format('YYYY-MM-DD')} 00:00:00`,
      });
    }
    if (value.end) {
      queryBuilder.andWhere('project.createdAt <= :end', {
        end: `${moment(value.end).format('YYYY-MM-DD')} 23:59:59`,
      });
    }

    return queryBuilder.getCount();
  }

  async findClosedProjectCount(value: GetProjectSummaryDto) {
    let queryBuilder = await this.projectRepository
      .createQueryBuilder('project')
      .where('project.isClosed = true');

    if (value.start) {
      queryBuilder.andWhere('project.createdAt >= :start', {
        start: `${moment(value.start).format('YYYY-MM-DD')} 00:00:00`,
      });
    }
    if (value.end) {
      queryBuilder.andWhere('project.createdAt <= :end', {
        end: `${moment(value.end).format('YYYY-MM-DD')} 23:59:59`,
      });
    }

    return queryBuilder.getCount();
  }

  async findKickedOffProjectCount(value: GetProjectSummaryDto) {
    let queryBuilder = await this.projectRepository
      .createQueryBuilder('project')
      .innerJoin('project.issues', 'issue')
      .innerJoin('issue.category', 'category')
      .where('category.id = :id', { id: 3 })
      .andWhere('project.isClosed = false');

    if (value.start) {
      queryBuilder.andWhere('project.createdAt >= :start', {
        start: `${moment(value.start).format('YYYY-MM-DD')} 00:00:00`,
      });
    }
    if (value.end) {
      queryBuilder.andWhere('project.createdAt <= :end', {
        end: `${moment(value.end).format('YYYY-MM-DD')} 23:59:59`,
      });
    }

    return queryBuilder.getCount();
  }

  async findActiveProjectCount(value: GetProjectSummaryDto) {
    let queryBuilder = await this.projectRepository
      .createQueryBuilder('project')
      .innerJoin('project.issues', 'issue')
      .innerJoin('issue.category', 'category')
      .innerJoin('category.charge', 'charge')
      .where('charge.id = :id', { id: 2 });

    if (value.start) {
      queryBuilder.andWhere('project.createdAt >= :start', {
        start: `${moment(value.start).format('YYYY-MM-DD')} 00:00:00`,
      });
    }
    if (value.end) {
      queryBuilder.andWhere('project.createdAt <= :end', {
        end: `${moment(value.end).format('YYYY-MM-DD')} 23:59:59`,
      });
    }

    return queryBuilder.getCount();
  }

  async findProjectById(id: number, user?: User) {
    const queryBuilder = this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.user', 'user')
      .leftJoinAndSelect('project.manager', 'manager')
      .leftJoinAndSelect('project.latestCategory', 'latestCategory')
      .leftJoinAndSelect('latestCategory.charge', 'charge')
      .leftJoinAndSelect('user.position', 'position')
      .leftJoinAndSelect('user.department', 'department')
      .leftJoinAndSelect('project.client', 'client');

    if (user) {
      queryBuilder.leftJoinAndSelect(
        'project.bookmarks',
        'bookmark',
        'bookmark.user_id = :userId',
        { userId: user.id },
      );
    }

    queryBuilder.where('project.id = :id', { id });

    return queryBuilder.getOne();
  }

  async findProjectByCode(code: string) {
    return await this.projectRepository
      .createQueryBuilder('project')
      .where('project.code = :code', { code })
      .getOne();
  }

  async findProjects(user: User, value: GetProjectsDto) {
    let queryBuilder = this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.user', 'user')
      .leftJoinAndSelect('project.manager', 'manager')
      .leftJoinAndSelect('project.latestCategory', 'latestCategory')
      .leftJoinAndSelect('latestCategory.charge', 'charge')
      .leftJoinAndSelect('user.position', 'position')
      .leftJoinAndSelect('user.department', 'department')
      .leftJoinAndSelect('project.client', 'client')
      .leftJoinAndSelect(
        'project.bookmarks',
        'bookmark',
        'bookmark.user_id = :id',
        { id: user.id },
      );

    if (value.search) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.orWhere('project.code ILIKE :search', {
            search: `%${value.search}%`,
          })
            .orWhere('project.name ILIKE :search', {
              search: `%${value.search}%`,
            })
            .orWhere('user.username ILIKE :search', {
              search: `%${value.search}%`,
            })
            .orWhere('client.name ILIKE :search', {
              search: `%${value.search}%`,
            });
        }),
      );
    }

    if (value.bookmark) {
      if (value.bookmark === true) {
        queryBuilder.andWhere('bookmark.id IS NOT NULL');
      } else {
        queryBuilder.andWhere('bookmark.id IS NULL');
      }
    }

    if (value.clients) {
      let clients = value.clients
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => !isNaN(n) && n > 0);

      const descendants = await this.projectClientService.findDescendants(
        clients[clients.length - 1],
      );

      queryBuilder.andWhere('project.client IN (:...descendants)', {
        descendants: descendants.map((e) => e.id),
      });
    }

    if (value.categories) {
      let categories = value.categories
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => !isNaN(n) && n > 0);

      queryBuilder.andWhere('project.latestCategory IN (:...categories)', {
        categories,
      });
    }

    switch (value.view) {
      case 'active':
        queryBuilder.andWhere('project.isClosed = false');
        break;
      case 'preexecuted':
        queryBuilder.andWhere('project.isPreexecuted = true');
        break;
      case 'closed':
        queryBuilder.andWhere('project.isClosed = true');
        break;
    }

    const orderType = value.order?.toUpperCase() as 'ASC' | 'DESC';

    switch (value.sort) {
      case 'updated':
        queryBuilder.orderBy('project.updatedAt', orderType);
        break;
      case 'created':
        queryBuilder.orderBy('project.createdAt', orderType);
        break;
      case 'code':
        queryBuilder.orderBy('project.code', orderType);
        break;
      case 'name':
        queryBuilder.orderBy('project.name', orderType);
        break;
      default:
        queryBuilder.orderBy('project.createdAt', 'DESC');
        break;
    }

    return queryBuilder
      .skip((value.page - 1) * value.limit)
      .take(value.limit)
      .getManyAndCount();
  }

  async getProjectStats(value: GetProjectStatsDto) {
    // 사용자에 해당하는 프로젝트들을 가져오기
    const users = await this.userService.getUsers({
      page: value.page,
      limit: value.limit,
    });

    const items = await Promise.all(
      users.items.map(async (user) => {
        const [projects, total] = await this.findProjectWithManagerId(
          user.id,
          value.start,
          value.end,
        );

        let valid = 0;

        // 프로젝트에 대한 valid 카운트
        await Promise.all(
          projects.map(async (project) => {
            // 최신 ISSUE가 존재하고, ID가 11이 아니면 valid 카운트 증가
            if (project.isClosed) {
              valid++;
            }
          }),
        );

        // 각 사용자의 projectStats DTO 생성
        return plainToInstance(ProjectStatsDto, {
          valid: valid,
          total: total,
          user: user,
        });
      }),
    );

    const projectStatsListDto = plainToInstance(ProjectStatsListDto, {
      items: items,
      page: value.page,
      total: users.total,
    });

    return projectStatsListDto;
  }

  async getProjectSummary(value: GetProjectSummaryDto) {
    const total = await this.findAllProjectCount(value);
    const closed = await this.findClosedProjectCount(value);
    const kickedOff = await this.findKickedOffProjectCount(value);
    const active = await this.findActiveProjectCount(value);

    return plainToInstance(ProjectSummaryDto, {
      total: total,
      closed: closed,
      kickedOff: kickedOff,
      active: active,
    });
  }

  async getProject(id: number) {
    const project = await this.findProjectById(id);

    if (!project) {
      throw new NotFoundException('project_not_found');
    }

    const ancestors = await this.projectClientService.findAncestors(
      project.client.id,
    );

    const projectDto = plainToInstance(ProjectDto, project, {
      excludeExtraneousValues: true,
    });
    projectDto.clients = plainToInstance(ProjectClientDto, ancestors, {
      excludeExtraneousValues: true,
    });

    return projectDto;
  }

  async getProjectWithUser(user: User, id: number) {
    const project = await this.findProjectById(id, user);

    if (!project) {
      throw new NotFoundException('project_not_found');
    }

    const ancestors = await this.projectClientService.findAncestors(
      project.client.id,
    );

    const projectDto = plainToInstance(ProjectDto, project, {
      excludeExtraneousValues: true,
    });
    projectDto.clients = plainToInstance(ProjectClientDto, ancestors, {
      excludeExtraneousValues: true,
    });
    projectDto.isBookmarked = project.bookmarks && project.bookmarks.length > 0;

    return projectDto;
  }

  async getProjects(user: User, value: GetProjectsDto) {
    const [projects, total] = await this.findProjects(user, value);

    const items = await Promise.all(
      projects.map(async (project) => {
        const ancestors = await this.projectClientService.findAncestors(
          project.client.id,
        );

        const projectDto = plainToInstance(ProjectDto, project, {
          excludeExtraneousValues: true,
        });

        projectDto.clients = ancestors.map((ancestor) =>
          plainToInstance(ProjectClientDto, ancestor, {
            excludeExtraneousValues: true,
          }),
        );
        projectDto.isBookmarked =
          project.bookmarks && project.bookmarks.length > 0;

        return projectDto;
      }),
    );

    const projectListDto = plainToInstance(ProjectListDto, {
      items: items,
      page: value.page,
      total: total,
    });

    return projectListDto;
  }

  async createProject(user: User, value: CreateProjectDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 프로젝트 코드 중복 체크
      const existingProject = await queryRunner.manager.findOne(Project, {
        where: { code: value.projectCode },
      });
      if (existingProject) {
        throw new ConflictException('project_exists');
      }

      // 연관 엔티티 조회
      const client = await queryRunner.manager.findOne(ProjectClient, {
        where: { id: value.clientId },
      });
      if (!client) throw new NotFoundException('client_not_found');

      const manager = await queryRunner.manager.findOne(User, {
        where: { id: value.managerId },
      });
      if (!manager) throw new NotFoundException('manager_not_found');

      // 프로젝트 생성
      const project = queryRunner.manager.create(Project, {
        code: value.projectCode,
        name: value.projectName,
        isPreexecuted: value.isPreexecuted,
        user: user,
        manager: manager,
        client: client,
      });

      const saved = await queryRunner.manager.save(project);

      // client 계층 조회
      const ancestors = await this.projectClientService.findAncestors(
        saved.client.id,
      );

      await queryRunner.commitTransaction();

      const projectDto = plainToInstance(ProjectDto, saved, {
        excludeExtraneousValues: true,
      });

      projectDto.isBookmarked = false;

      projectDto.clients = ancestors.map((ancestor) =>
        plainToInstance(ProjectClientDto, ancestor, {
          excludeExtraneousValues: true,
        }),
      );

      return projectDto;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async updateProject(user: User, id: number, value: UpdateProjectDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const project = await queryRunner.manager
        .getRepository(Project)
        .createQueryBuilder('project')
        .leftJoinAndSelect('project.user', 'user')
        .leftJoinAndSelect('project.manager', 'manager')
        .leftJoinAndSelect('project.latestCategory', 'latestCategory')
        .leftJoinAndSelect('latestCategory.charge', 'charge')
        .leftJoinAndSelect('user.position', 'position')
        .leftJoinAndSelect('user.department', 'department')
        .leftJoinAndSelect('project.client', 'client')
        .leftJoinAndSelect(
          'project.bookmarks',
          'bookmark',
          'bookmark.user_id = :userId',
          { userId: user.id },
        )
        .where('project.id = :id', { id })
        .getOne();

      if (!project) throw new NotFoundException('project_not_found');
      if (project.user.id !== user.id && !user.isAdmin)
        throw new ForbiddenException('no_permission');

      // 프로젝트 코드 중복 체크
      if (value.projectCode && value.projectCode !== project.code) {
        const existingProject = await queryRunner.manager.findOne(Project, {
          where: { code: value.projectCode },
        });
        if (existingProject) throw new ConflictException('project_exists');
        project.code = value.projectCode;
      }

      // 이름, 상태 업데이트
      project.name = value.projectName ?? project.name;
      project.isPreexecuted = value.isPreexecuted ?? project.isPreexecuted;
      project.isContracted = value.isContracted ?? project.isContracted;
      project.isClosed = value.isClosed ?? project.isClosed;
      project.closureMessage = value.closureMessage ?? project.closureMessage;

      // 연관 엔티티 업데이트
      if (value.managerId) {
        const manager = await queryRunner.manager.findOne(User, {
          where: { id: value.managerId },
        });
        if (!manager) throw new NotFoundException('manager_not_found');
        project.manager = manager;
      }

      if (value.clientId && value.clientId !== project.client.id) {
        const client = await queryRunner.manager.findOne(ProjectClient, {
          where: { id: value.clientId },
        });
        if (!client) throw new NotFoundException('client_not_found');
        project.client = client;
      }

      const category = await queryRunner.manager.findOne(IssueCategory, {
        where: { id: value.categoryId },
        relations: ['charge'],
      });
      project.latestCategory = category;

      const saved = await queryRunner.manager.save(project);

      const isBookmarked = project.bookmarks?.length > 0;

      // client 계층 조회
      const ancestors = await this.projectClientService.findAncestors(
        saved.client.id,
      );

      await queryRunner.commitTransaction();

      const projectDto = plainToInstance(
        ProjectDto,
        { ...saved, isBookmarked },
        {
          excludeExtraneousValues: true,
        },
      );
      projectDto.clients = ancestors.map((ancestor) =>
        plainToInstance(ProjectClientDto, ancestor, {
          excludeExtraneousValues: true,
        }),
      );

      return projectDto;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async deleteProject(id: number) {
    const project = await this.findProjectById(id);

    if (!project) {
      throw new NotFoundException('project_not_found');
    }

    await this.projectRepository.softDelete(id);

    return { success: true };
  }

  async restoreProject(id: number) {
    await this.projectRepository.restore(id);
    const project = await this.findProjectById(id);
    if (!project) {
      throw new NotFoundException('project_not_found');
    }

    return plainToInstance(ProjectDto, project, {
      excludeExtraneousValues: true,
    });
  }
}

import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { Project } from '@/entity/project/project.entity';
import { Brackets, DataSource, Repository } from 'typeorm';
import { ProjectClientService } from './project-client.service';
import { ProjectClientDto } from './dto/project-client';
import { GetProjectsDto } from './dto/get-projects';
import { User } from '@/entity/user/user.entity';
import { CreateProjectDto } from './dto/create-project';
import { UpdateProjectDto } from './dto/update-project';
import { IssueCategory } from '@/entity/issue/issue-category.entity';
import { ProjectClient } from '@/entity/project/project-client.entity';
import { ProjectDto, ProjectListDto } from './dto/project';
import { ProjectItemCountDto } from './dto/project-item-count';
import { Report } from '@/entity/report/report.entity';
import { Issue } from '@/entity/issue/issue.entity';

@Injectable()
export class ProjectService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    private readonly projectClientService: ProjectClientService,
    @InjectRepository(Issue)
    private readonly issueRepository: Repository<Issue>,
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
  ) {}

  async findProjectById(id: number, user?: User) {
    const queryBuilder = this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.user', 'user')
      .leftJoinAndSelect('project.manager', 'manager')
      .leftJoinAndSelect('project.latestCategory', 'latestCategory')
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
      .leftJoinAndSelect('user.position', 'position')
      .leftJoinAndSelect('user.department', 'department')
      .leftJoinAndSelect('project.client', 'client');

    // 1. 검색어 필터링
    if (value.search) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.orWhere('project.code ILIKE :search', {
            search: `%${value.search}%`,
          })
            .orWhere('project.name ILIKE :search', {
              search: `%${value.search}%`,
            })
            .orWhere('manager.username ILIKE :search', {
              search: `%${value.search}%`,
            })
            .orWhere('client.name ILIKE :search', {
              search: `%${value.search}%`,
            });
        }),
      );
    }

    // 2. 북마크 필터링 분기 리팩토링 (서브쿼리 도입으로 페이징 버그 차단)
    const isBookmarkTrue =
      value.bookmark === true || String(value.bookmark) === 'true';

    if (isBookmarkTrue) {
      // 북마크된 프로젝트만 조회: 기존 innerJoin 방식 유지 (안전함)
      queryBuilder.innerJoinAndSelect(
        'project.bookmarks',
        'bookmark',
        'bookmark.user_id = :currentUserId',
        { currentUserId: user.id },
      );
    } else {
      // [수정] bookmark가 false이거나 없을(undefined) 때는 필터링을 하지 않음 (모든 프로젝트 노출)
      // 대신 로그인한 유저의 북마크 여부 데이터는 leftJoin으로 매핑해서 가져옴
      queryBuilder.leftJoinAndSelect(
        'project.bookmarks',
        'bookmark',
        'bookmark.user_id = :currentUserId',
        { currentUserId: user.id },
      );
    }

    // 3. 고객사 필터링
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

    // 4. 카테고리 필터링
    if (value.categories) {
      let categories = value.categories
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => !isNaN(n) && n > 0);

      queryBuilder.andWhere('project.latestCategory IN (:...categories)', {
        categories,
      });
    }

    // 5. 프로젝트 상태 필터링
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

    if (value.isMine) {
      queryBuilder.andWhere('manager.id = :currentUserId', {
        currentUserId: user.id,
      });
    }

    // 6. 정렬 조건 설정
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

    // 7. 페이징 및 결과 반환
    return queryBuilder
      .skip((value.page - 1) * value.limit)
      .take(value.limit)
      .getManyAndCount();
  }

  async countContractsById(id: number) {
    const [contractCount, transactionCount, kickoffCount, paymentCount] =
      await Promise.all([
        this.issueRepository
          .createQueryBuilder('issue')
          .leftJoinAndSelect('issue.project', 'project')
          .innerJoinAndSelect('issue.contract', 'contract')
          .where('project.id = :id', { id })
          .getCount(),
        this.issueRepository
          .createQueryBuilder('issue')
          .leftJoinAndSelect('issue.project', 'project')
          .innerJoinAndSelect('issue.transaction', 'transaction')
          .where('project.id = :id', { id })
          .getCount(),
        this.issueRepository
          .createQueryBuilder('issue')
          .leftJoinAndSelect('issue.project', 'project')
          .innerJoinAndSelect('issue.kickoff', 'kickoff')
          .where('project.id = :id', { id })
          .getCount(),
        this.issueRepository
          .createQueryBuilder('issue')
          .leftJoinAndSelect('issue.project', 'project')
          .innerJoinAndSelect('issue.payment', 'payment')
          .where('project.id = :id', { id })
          .getCount(),
      ]);

    return contractCount + transactionCount + kickoffCount + paymentCount;
  }

  async countApprovalsById(id: number) {
    return await this.issueRepository
      .createQueryBuilder('issue')
      .leftJoinAndSelect('issue.project', 'project')
      .innerJoinAndSelect('issue.approval', 'approval')
      .where('project.id = :id', { id })
      .getCount();
  }

  async countProcurementsById(id: number) {
    return await this.issueRepository
      .createQueryBuilder('issue')
      .leftJoinAndSelect('issue.project', 'project')
      .innerJoinAndSelect('issue.procurement', 'procurement')
      .where('project.id = :id', { id })
      .getCount();
  }

  async countReportsById(id: number) {
    return await this.reportRepository.count({
      where: { project: { id } },
    });
  }

  async getProject(user: User, id: number) {
    const project = await this.findProjectById(id, user);

    if (!project) {
      throw new NotFoundException('project_not_found');
    }

    const ancestors = await this.projectClientService.findAncestors(
      project.client.id,
    );

    const projectDto = plainToInstance(
      ProjectDto,
      {
        ...project,
        clients: ancestors,
        isBookmarked: project.bookmarks && project.bookmarks.length > 0,
      },
      {
        excludeExtraneousValues: true,
      },
    );

    return projectDto;
  }

  async getProjectWithoutUser(id: number) {
    const project = await this.findProjectById(id);

    if (!project) {
      throw new NotFoundException('project_not_found');
    }

    const ancestors = await this.projectClientService.findAncestors(
      project.client.id,
    );

    const projectDto = plainToInstance(
      ProjectDto,
      {
        ...project,
        clients: ancestors,
        isBookmarked: project.bookmarks && project.bookmarks.length > 0,
      },
      {
        excludeExtraneousValues: true,
      },
    );

    return projectDto;
  }

  async getProjects(user: User, query: GetProjectsDto) {
    const [projects, total] = await this.findProjects(user, query);

    const items = await Promise.all(
      projects.map(async (project) => {
        const ancestors = await this.projectClientService.findAncestors(
          project.client.id,
        );

        const projectDto = plainToInstance(
          ProjectDto,
          {
            ...project,
            clients: ancestors,
            isBookmarked: project.bookmarks && project.bookmarks.length > 0,
          },
          {
            excludeExtraneousValues: true,
          },
        );

        return projectDto;
      }),
    );

    const projectListDto = plainToInstance(ProjectListDto, {
      items: items,
      page: query.page,
      total: total,
    });

    return projectListDto;
  }

  async getProjectItemCount(id: number) {
    const contracts = await this.countContractsById(id);
    const approvals = await this.countApprovalsById(id);
    const procurements = await this.countProcurementsById(id);
    const reports = await this.countReportsById(id);

    const countDto = plainToInstance(ProjectItemCountDto, {
      contracts,
      approvals,
      procurements,
      reports,
    });

    return countDto;
  }

  async createProject(user: User, body: CreateProjectDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 프로젝트 코드 중복 체크
      const existingProject = await queryRunner.manager.findOne(Project, {
        where: { code: body.projectCode },
      });
      if (existingProject) {
        throw new ConflictException('project_exists');
      }

      // 연관 엔티티 조회
      const client = await queryRunner.manager.findOne(ProjectClient, {
        where: { id: body.clientId },
      });
      if (!client) throw new NotFoundException('client_not_found');

      let manager: User | null = null;
      if (body.managerId) {
        manager = await queryRunner.manager.findOne(User, {
          where: { id: body.managerId },
        });
        if (!manager) throw new NotFoundException('manager_not_found');
      }

      // 프로젝트 생성
      const project = queryRunner.manager.create(Project, {
        code: body.projectCode,
        name: body.projectName,
        isPreexecuted: body.isPreexecuted,
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

  async updateProject(user: User, id: number, body: UpdateProjectDto) {
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

      if (project.user.id !== user.id && !user.isAdmin) {
        throw new ForbiddenException('no_permission');
      }

      // 프로젝트 코드 중복 체크
      if (body.projectCode && body.projectCode !== project.code) {
        const existingProject = await queryRunner.manager.findOne(Project, {
          where: { code: body.projectCode },
        });
        if (existingProject) throw new ConflictException('project_exists');
        project.code = body.projectCode;
      }

      // 이름, 상태 업데이트
      project.name = body.projectName ?? project.name;
      project.isPreexecuted = body.isPreexecuted ?? project.isPreexecuted;
      project.isContracted = body.isContracted ?? project.isContracted;
      project.isClosed = body.isClosed ?? project.isClosed;
      project.closureMessage = body.closureMessage ?? project.closureMessage;

      // 연관 엔티티 업데이트
      if (body.managerId) {
        const manager = await queryRunner.manager.findOne(User, {
          where: { id: body.managerId },
        });
        if (!manager) throw new NotFoundException('manager_not_found');
        project.manager = manager;
      }

      if (body.clientId && body.clientId !== project.client.id) {
        const client = await queryRunner.manager.findOne(ProjectClient, {
          where: { id: body.clientId },
        });
        if (!client) throw new NotFoundException('client_not_found');
        project.client = client;
      }

      const category = await queryRunner.manager.findOne(IssueCategory, {
        where: { id: body.categoryId },
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
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const project = await queryRunner.manager.findOne(Project, {
        where: { id },
      });

      if (!project) {
        throw new NotFoundException('project_not_found');
      }

      await queryRunner.manager.softDelete(Project, id);

      await queryRunner.commitTransaction();

      return true;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async restoreProject(id: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.restore(Project, id);

      const project = await queryRunner.manager.findOne(Project, {
        where: { id },
        relations: [
          'user',
          'manager',
          'latestCategory',
          'user.position',
          'user.department',
          'client',
        ],
      });

      if (!project) {
        throw new NotFoundException('project_not_found');
      }

      await queryRunner.commitTransaction();

      return plainToInstance(ProjectDto, project, {
        excludeExtraneousValues: true,
      });
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}

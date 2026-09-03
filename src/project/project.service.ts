import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { Project } from '@/entity/project/project.entity';
import {
  Brackets,
  DataSource,
  EntityManager,
  IsNull,
  Repository,
} from 'typeorm';
import { ProjectClientService } from './project-client.service';
import { ProjectClientDto } from './dto/project-client';
import { GetProjectsDto } from './dto/get-projects';
import { User } from '@/entity/user/user.entity';
import { assertWriteAccess } from '@/common/policies/write-access.policy';
import { assertOwnerOrAdmin } from '@/common/policies/resource-access.policy';
import { CreateProjectDto } from './dto/create-project';
import { UpdateProjectDto } from './dto/update-project';
import { IssueCategory } from '@/entity/issue/issue-category.entity';
import { ProjectClient } from '@/entity/project/project-client.entity';
import { ProjectDto, ProjectListDto } from './dto/project';
import { ProjectItemCountDto } from './dto/project-item-count';
import { Report } from '@/entity/report/report.entity';
import { Issue } from '@/entity/issue/issue.entity';
import { CloseProjectDto } from './dto/close-project';
import { TransactionIssueItem } from '@/entity/issue/transaction/transaction-issue-item.entity';

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

  private hasUnpaidTransactionItem(manager: EntityManager, projectId: number) {
    return manager.exists(TransactionIssueItem, {
      where: [
        {
          project: { id: projectId },
          isPaid: false,
        },
        {
          project: { id: projectId },
          isPaid: IsNull(),
        },
      ],
    });
  }

  private async isProjectClosable(
    manager: EntityManager,
    projectId: number,
    isClosed: boolean,
  ) {
    if (isClosed) return false;

    const hasTransactionItem = await manager.exists(TransactionIssueItem, {
      where: { project: { id: projectId } },
    });

    if (!hasTransactionItem) return false;

    const hasUnpaidItem = await this.hasUnpaidTransactionItem(
      manager,
      projectId,
    );

    return !hasUnpaidItem;
  }

  async findProjectById(id: number, user?: User) {
    const queryBuilder = this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.createdBy', 'createdBy')
      .leftJoinAndSelect('project.updatedBy', 'updatedBy')
      .leftJoinAndSelect('project.manager', 'manager')
      .leftJoinAndSelect('project.latestCategory', 'latestCategory')
      .leftJoinAndSelect('createdBy.rank', 'rank')
      .leftJoinAndSelect('createdBy.department', 'department')
      .leftJoinAndSelect('updatedBy.rank', 'updatedByRank')
      .leftJoinAndSelect('updatedBy.department', 'updatedByDepartment')
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
      .leftJoinAndSelect('project.createdBy', 'createdBy')
      .leftJoinAndSelect('project.manager', 'manager')
      .leftJoinAndSelect('project.latestCategory', 'latestCategory')
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

  async getProjectForEdit(user: User, id: number) {
    const project = await this.findProjectById(id, user);

    if (!project) {
      throw new NotFoundException('not_found_project');
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

    projectDto.isClosable = await this.isProjectClosable(
      this.dataSource.manager,
      id,
      projectDto.isClosed,
    );

    return projectDto;
  }

  async getProjectDetail(user: User, id: number) {
    const incrementResult = await this.projectRepository
      .createQueryBuilder()
      .update(Project)
      .set({
        views: () => '"views" + 1',
        updatedAt: () => '"updated_at"',
      })
      .where('"id" = :id', { id })
      .andWhere('"deleted_at" IS NULL')
      .execute();

    if (!incrementResult.affected) {
      throw new NotFoundException('not_found_project');
    }

    return this.getProjectForEdit(user, id);
  }

  async getProjectWithoutUser(id: number) {
    const project = await this.findProjectById(id);

    if (!project) {
      throw new NotFoundException('not_found_project');
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

    const clientIds = [
      ...new Set(projects.map((project) => project.client.id)),
    ];
    const ancestorGroups =
      await this.projectClientService.findAllAncestors(clientIds);
    const ancestorsByClientId = new Map(
      ancestorGroups.map(({ descendantId, ancestors }) => [
        descendantId,
        ancestors,
      ]),
    );

    const items = projects.map((project) => ({
      ...project,
      clients: ancestorsByClientId.get(project.client.id) ?? [],
      isBookmarked: project.bookmarks && project.bookmarks.length > 0,
    }));

    const projectListDto = plainToInstance(
      ProjectListDto,
      {
        items,
        page: query.page,
        total,
      },
      { excludeExtraneousValues: true },
    );

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
    assertWriteAccess(user);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 프로젝트 코드 중복 체크
      const existingProject = await queryRunner.manager.findOne(Project, {
        where: { code: body.projectCode },
      });
      if (existingProject) {
        throw new ConflictException('conflict_project_code_already_exists');
      }

      // 연관 엔티티 조회
      const client = await queryRunner.manager.findOne(ProjectClient, {
        where: { id: body.clientId },
      });
      if (!client) throw new NotFoundException('not_found_client');

      let manager: User | null = null;
      if (body.managerId) {
        manager = await queryRunner.manager.findOne(User, {
          where: { id: body.managerId },
        });
        if (!manager) throw new NotFoundException('not_found_manager');
      }

      // 프로젝트 생성
      const project = queryRunner.manager.create(Project, {
        code: body.projectCode,
        name: body.projectName,
        isPreexecuted: body.isPreexecuted,
        createdBy: user,
        updatedBy: user,
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
      projectDto.isClosable = false;

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
    assertWriteAccess(user);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const project = await queryRunner.manager
        .getRepository(Project)
        .createQueryBuilder('project')
        .leftJoinAndSelect('project.createdBy', 'createdBy')
        .leftJoinAndSelect('project.updatedBy', 'updatedBy')
        .leftJoinAndSelect('project.manager', 'manager')
        .leftJoinAndSelect('project.latestCategory', 'latestCategory')
        .leftJoinAndSelect('createdBy.rank', 'rank')
        .leftJoinAndSelect('createdBy.department', 'department')
        .leftJoinAndSelect('updatedBy.rank', 'updatedByRank')
        .leftJoinAndSelect('updatedBy.department', 'updatedByDepartment')
        .leftJoinAndSelect('project.client', 'client')
        .leftJoinAndSelect(
          'project.bookmarks',
          'bookmark',
          'bookmark.user_id = :userId',
          { userId: user.id },
        )
        .where('project.id = :id', { id })
        .setLock('pessimistic_write', undefined, ['project'])
        .getOne();

      if (!project) throw new NotFoundException('not_found_project');

      assertOwnerOrAdmin(user, project.createdBy.id);

      // 프로젝트 코드 중복 체크
      if (body.projectCode && body.projectCode !== project.code) {
        const existingProject = await queryRunner.manager.findOne(Project, {
          where: { code: body.projectCode },
        });
        if (existingProject)
          throw new ConflictException('conflict_project_code_already_exists');
        project.code = body.projectCode;
      }

      // 이름, 상태 업데이트
      project.name = body.projectName ?? project.name;
      project.isPreexecuted = body.isPreexecuted ?? project.isPreexecuted;
      project.isContracted = body.isContracted ?? project.isContracted;

      // 연관 엔티티 업데이트
      if (body.managerId) {
        const manager = await queryRunner.manager.findOne(User, {
          where: { id: body.managerId },
        });
        if (!manager) throw new NotFoundException('not_found_manager');
        project.manager = manager;
      }

      if (body.clientId && body.clientId !== project.client.id) {
        const client = await queryRunner.manager.findOne(ProjectClient, {
          where: { id: body.clientId },
        });
        if (!client) throw new NotFoundException('not_found_client');
        project.client = client;
      }

      if (body.categoryId) {
        const category = await queryRunner.manager.findOne(IssueCategory, {
          where: { id: body.categoryId },
        });
        if (!category) throw new NotFoundException('not_found_category');

        if ((project.latestCategory?.id ?? 0) < category.id) {
          project.latestCategory = category;
        }
      }
      project.updatedBy = user;

      const saved = await queryRunner.manager.save(project);

      const isBookmarked = project.bookmarks?.length > 0;
      const isClosable = await this.isProjectClosable(
        queryRunner.manager,
        saved.id,
        saved.isClosed,
      );

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
      projectDto.isClosable = isClosable;

      return projectDto;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async closeProject(user: User, id: number, body: CloseProjectDto) {
    assertWriteAccess(user);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const project = await queryRunner.manager
        .getRepository(Project)
        .createQueryBuilder('project')
        .leftJoinAndSelect('project.createdBy', 'createdBy')
        .where('project.id = :id', { id })
        .setLock('pessimistic_write')
        .getOne();

      if (!project) {
        throw new NotFoundException('not_found_project');
      }

      assertOwnerOrAdmin(user, project.createdBy.id);

      if (project.isClosed) {
        throw new ConflictException('conflict_project_already_closed');
      }

      const hasUnpaidItem = await queryRunner.manager.exists(
        TransactionIssueItem,
        {
          where: [
            {
              project: { id: project.id },
              isPaid: false,
            },
            {
              project: { id: project.id },
              isPaid: IsNull(),
            },
          ],
        },
      );

      if (hasUnpaidItem) {
        throw new ConflictException(
          'conflict_project_has_unpaid_transaction_item',
        );
      }

      project.isClosed = true;
      project.closedAt = new Date();
      project.closureMessage = body.closureMessage ?? null;
      project.updatedBy = user;

      const saved = await queryRunner.manager.save(project);

      await queryRunner.commitTransaction();

      return saved;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async deleteProject(user: User, id: number) {
    assertWriteAccess(user);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const project = await queryRunner.manager.findOne(Project, {
        where: { id },
      });

      if (!project) {
        throw new NotFoundException('not_found_project');
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

  async restoreProject(user: User, id: number) {
    assertWriteAccess(user);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.restore(Project, id);

      const project = await queryRunner.manager.findOne(Project, {
        where: { id },
        relations: [
          'createdBy',
          'updatedBy',
          'manager',
          'latestCategory',
          'createdBy.rank',
          'createdBy.department',
          'updatedBy.rank',
          'updatedBy.department',
          'client',
        ],
      });

      if (!project) {
        throw new NotFoundException('not_found_project');
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

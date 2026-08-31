import { Injectable } from '@nestjs/common';
import { Brackets, DataSource, SelectQueryBuilder } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { Project } from '@/entity/project/project.entity';
import { Issue } from '@/entity/issue/issue.entity';
import { Report } from '@/entity/report/report.entity';
import { User } from '@/entity/user/user.entity';
import { ProjectClientClosure } from '@/entity/project/project-client-closure.entity';
import { ProjectClientDto } from '@/project/dto/project-client';
import { ScheduleDto } from '@/schedule/dto/schedule';
import {
  GetWorkIssuesDto,
  GetWorkProjectsDto,
  GetWorkReportsDto,
} from './dto/get-work-items';
import { WorkProjectListDto } from './dto/work-project';
import { WorkIssueListDto, WorkIssueListItemDto } from './dto/work-issue';
import { WorkReportListDto, WorkReportListItemDto } from './dto/work-report';
import dayjs from 'dayjs';

@Injectable()
export class WorkService {
  constructor(private readonly dataSource: DataSource) {}

  private parseIds(value?: string) {
    if (!value) return [];

    return [
      ...new Set(
        value
          .split(',')
          .map((item) => Number(item.trim()))
          .filter((id) => Number.isInteger(id) && id > 0),
      ),
    ];
  }

  private async applyClientFilter<T>(
    queryBuilder: SelectQueryBuilder<T>,
    clientAlias: string,
    clients?: string,
  ) {
    const clientIds = this.parseIds(clients);
    if (!clientIds.length) return;

    const descendants = await this.dataSource
      .getRepository(ProjectClientClosure)
      .createQueryBuilder('closure')
      .select('closure.descendant', 'id')
      .where('closure.ancestor IN (:...clientIds)', { clientIds })
      .getRawMany<{ id: number }>();

    const descendantIds = [...new Set(descendants.map(({ id }) => Number(id)))];

    if (!descendantIds.length) {
      queryBuilder.andWhere('1 = 0');
      return;
    }

    queryBuilder.andWhere(`${clientAlias}.id IN (:...descendantIds)`, {
      descendantIds,
    });
  }

  private async getAncestorsByClientId(clientIds: number[]) {
    if (!clientIds.length) return new Map<number, ProjectClientDto[]>();

    const closures = await this.dataSource
      .getRepository(ProjectClientClosure)
      .createQueryBuilder('closure')
      .innerJoinAndSelect('closure.ancestorClient', 'ancestor')
      .where('closure.descendant IN (:...clientIds)', { clientIds })
      .orderBy('closure.descendant', 'ASC')
      .addOrderBy('closure.depth', 'DESC')
      .getMany();

    const result = new Map<number, ProjectClientDto[]>();

    for (const closure of closures) {
      const ancestors = result.get(closure.descendant) ?? [];
      ancestors.push(
        plainToInstance(ProjectClientDto, closure.ancestorClient, {
          excludeExtraneousValues: true,
        }),
      );
      result.set(closure.descendant, ancestors);
    }

    return result;
  }

  async getProjects(user: User, query: GetWorkProjectsDto) {
    const queryBuilder = this.dataSource
      .getRepository(Project)
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.createdBy', 'createdBy')
      .leftJoinAndSelect('createdBy.rank', 'createdByRank')
      .leftJoinAndSelect('createdBy.department', 'createdByDepartment')
      .leftJoinAndSelect('project.manager', 'manager')
      .leftJoinAndSelect('manager.rank', 'managerRank')
      .leftJoinAndSelect('manager.department', 'managerDepartment')
      .leftJoinAndSelect('project.latestCategory', 'latestCategory')
      .leftJoinAndSelect('project.client', 'client')
      .leftJoinAndSelect(
        'project.bookmarks',
        'bookmark',
        'bookmark.user_id = :userId',
        { userId: user.id },
      )
      .where('manager.id = :userId', { userId: user.id });

    if (query.search) {
      queryBuilder.andWhere(
        new Brackets((builder) => {
          builder
            .where('project.code ILIKE :search', {
              search: `%${query.search}%`,
            })
            .orWhere('project.name ILIKE :search', {
              search: `%${query.search}%`,
            })
            .orWhere('manager.username ILIKE :search', {
              search: `%${query.search}%`,
            })
            .orWhere('client.name ILIKE :search', {
              search: `%${query.search}%`,
            });
        }),
      );
    }

    await this.applyClientFilter(queryBuilder, 'client', query.clients);

    const categories = this.parseIds(query.categories);
    if (categories.length) {
      queryBuilder.andWhere('latestCategory.id IN (:...categories)', {
        categories,
      });
    }

    switch (query.status) {
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

    const order = (query.order ?? 'desc').toUpperCase() as 'ASC' | 'DESC';
    const projectSortColumns = {
      updated: 'project.updatedAt',
      created: 'project.createdAt',
      code: 'project.code',
      name: 'project.name',
    } as const;

    const [projects, total] = await queryBuilder
      .orderBy(projectSortColumns[query.sort ?? 'created'], order)
      .addOrderBy('project.id', order)
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    const clientIds = [
      ...new Set(projects.map((project) => project.client.id)),
    ];
    const ancestorsByClientId = await this.getAncestorsByClientId(clientIds);

    return plainToInstance(
      WorkProjectListDto,
      {
        items: projects.map((project) => ({
          ...project,
          clients: ancestorsByClientId.get(project.client.id) ?? [],
          isBookmarked: project.bookmarks?.length > 0,
        })),
        page: query.page,
        total,
      },
      { excludeExtraneousValues: true },
    );
  }

  async getIssues(user: User, query: GetWorkIssuesDto) {
    const queryBuilder = this.dataSource
      .getRepository(Issue)
      .createQueryBuilder('issue')
      .leftJoinAndSelect('issue.project', 'project')
      .leftJoinAndSelect('project.client', 'client')
      .leftJoinAndSelect('issue.category', 'category')
      .leftJoinAndSelect('issue.createdBy', 'createdBy')
      .leftJoinAndSelect('createdBy.rank', 'rank')
      .leftJoinAndSelect('createdBy.department', 'department')
      .where('createdBy.id = :userId', { userId: user.id });

    if (query.search) {
      queryBuilder.andWhere(
        new Brackets((builder) => {
          builder
            .where('project.code ILIKE :search', {
              search: `%${query.search}%`,
            })
            .orWhere('project.name ILIKE :search', {
              search: `%${query.search}%`,
            })
            .orWhere('issue.content ILIKE :search', {
              search: `%${query.search}%`,
            })
            .orWhere('category.name ILIKE :search', {
              search: `%${query.search}%`,
            })
            .orWhere('client.name ILIKE :search', {
              search: `%${query.search}%`,
            });
        }),
      );
    }

    await this.applyClientFilter(queryBuilder, 'client', query.clients);

    const categories = this.parseIds(query.categories);
    if (categories.length) {
      queryBuilder.andWhere('category.id IN (:...categories)', { categories });
    }

    const order = (query.order ?? 'desc').toUpperCase() as 'ASC' | 'DESC';
    const issueSortColumns = {
      updated: 'issue.updatedAt',
      created: 'issue.createdAt',
      category: 'category.name',
    } as const;

    const [issues, total] = await queryBuilder
      .orderBy(issueSortColumns[query.sort ?? 'created'], order)
      .addOrderBy('issue.id', order)
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    const clientIds = [
      ...new Set(issues.map((issue) => issue.project.client.id)),
    ];
    const ancestorsByClientId = await this.getAncestorsByClientId(clientIds);

    const items = issues.map((issue) =>
      plainToInstance(
        WorkIssueListItemDto,
        {
          ...issue,
          projectId: issue.project.id,
          projectCode: issue.project.code,
          projectName: issue.project.name,
          clients: ancestorsByClientId.get(issue.project.client.id) ?? [],
        },
        { excludeExtraneousValues: true },
      ),
    );

    return plainToInstance(
      WorkIssueListDto,
      { items, page: query.page, total },
      { excludeExtraneousValues: true },
    );
  }

  async getReports(user: User, query: GetWorkReportsDto) {
    const queryBuilder = this.dataSource
      .getRepository(Report)
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.project', 'project')
      .leftJoinAndSelect('project.client', 'projectClient')
      .leftJoinAndSelect('report.createdBy', 'createdBy')
      .leftJoinAndSelect('createdBy.rank', 'createdByRank')
      .leftJoinAndSelect('createdBy.department', 'createdByDepartment')
      .leftJoinAndSelect('report.schedule', 'schedule')
      .leftJoinAndSelect('schedule.category', 'scheduleCategory')
      .leftJoinAndSelect('schedule.user', 'scheduleUser')
      .leftJoinAndSelect('scheduleUser.rank', 'scheduleUserRank')
      .leftJoinAndSelect('scheduleUser.department', 'scheduleUserDepartment')
      .where('createdBy.id = :userId', { userId: user.id });

    if (query.search) {
      queryBuilder.andWhere(
        new Brackets((builder) => {
          builder
            .where('project.code ILIKE :search', {
              search: `%${query.search}%`,
            })
            .orWhere('project.name ILIKE :search', {
              search: `%${query.search}%`,
            })
            .orWhere('report.content ILIKE :search', {
              search: `%${query.search}%`,
            })
            .orWhere('schedule.summary ILIKE :search', {
              search: `%${query.search}%`,
            })
            .orWhere('scheduleCategory.name ILIKE :search', {
              search: `%${query.search}%`,
            })
            .orWhere('projectClient.name ILIKE :search', {
              search: `%${query.search}%`,
            });
        }),
      );
    }

    await this.applyClientFilter(queryBuilder, 'projectClient', query.clients);

    const categories = this.parseIds(query.categories);
    if (categories.length) {
      queryBuilder.andWhere('scheduleCategory.id IN (:...categories)', {
        categories,
      });
    }

    if (query.start) {
      queryBuilder.andWhere('schedule.end >= :start', {
        start: dayjs(query.start).startOf('day').toDate(),
      });
    }

    if (query.end) {
      queryBuilder.andWhere('schedule.start <= :end', {
        end: dayjs(query.end).endOf('day').toDate(),
      });
    }

    const order = (query.order ?? 'desc').toUpperCase() as 'ASC' | 'DESC';
    const reportSortColumns = {
      updated: 'report.updatedAt',
      created: 'report.createdAt',
      category: 'scheduleCategory.name',
      schedule: 'schedule.start',
    } as const;

    const [reports, total] = await queryBuilder
      .orderBy(
        reportSortColumns[query.sort ?? 'created'],
        order,
        query.sort === 'category' || query.sort === 'schedule'
          ? 'NULLS LAST'
          : undefined,
      )
      .addOrderBy('report.id', order)
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    const clientIds = [
      ...new Set(reports.map((report) => report.project.client.id)),
    ];
    const ancestorsByClientId = await this.getAncestorsByClientId(clientIds);

    const items = reports.map((report) => {
      const clients = ancestorsByClientId.get(report.project.client.id) ?? [
        report.project.client,
      ];
      const schedule = report.schedule
        ? plainToInstance(
            ScheduleDto,
            {
              ...report.schedule,
              reportId: report.id,
              projectId: report.project.id,
              projectCode: report.project.code,
              projectName: report.project.name,
              projectClientId: clients[0].id,
              projectClientName: clients[clients.length - 1].name,
            },
            { excludeExtraneousValues: true },
          )
        : null;

      return plainToInstance(
        WorkReportListItemDto,
        {
          ...report,
          projectId: report.project.id,
          projectCode: report.project.code,
          projectName: report.project.name,
          clients,
          schedule,
        },
        { excludeExtraneousValues: true },
      );
    });

    return plainToInstance(
      WorkReportListDto,
      { items, page: query.page, total },
      { excludeExtraneousValues: true },
    );
  }
}

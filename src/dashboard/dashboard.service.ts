import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Project } from '@/entity/project/project.entity';
import { Schedule } from '@/entity/schedule/schedule.entity';
import { Repository } from 'typeorm';
import { GetProjectStatsDto } from './dto/get-project-stats';
import { GetProjectSummaryDto } from './dto/get-project-summary';
import { plainToInstance } from 'class-transformer';
import { ProjectStatsDto, ProjectStatsListDto } from './dto/project-stats';
import { ProjectSummaryDto } from './dto/project-summary';
import { UserService } from '@/user/user.service';
import dayjs from 'dayjs';
import { TodayScheduleDto } from './dto/today-schedule';
import { Document } from '@/entity/document/document.entity';
import { Issue } from '@/entity/issue/issue.entity';
import { Report } from '@/entity/report/report.entity';
import { Brackets } from 'typeorm';
import { GetDashboardSearchDto } from './dto/get-search';
import {
  DashboardSearchItemType,
  DashboardSearchResultDto,
} from './dto/search';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Schedule)
    private readonly scheduleRepository: Repository<Schedule>,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @InjectRepository(Issue)
    private readonly issueRepository: Repository<Issue>,
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    private userService: UserService,
  ) {}

  private getIssueCategoryType(id: number) {
    switch (id) {
      case 1:
        return 'contract';
      case 2:
        return 'kickoff';
      case 3:
        return 'approval';
      case 4:
        return 'procurement';
      case 5:
        return 'transaction';
      case 6:
        return 'payment';
      default:
        return 'unknown';
    }
  }

  async search(value: GetDashboardSearchDto) {
    const search = `%${value.search}%`;
    const exact = value.search;
    const prefix = `${value.search}%`;

    const projectQuery = this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.client', 'projectClient')
      .leftJoinAndSelect('project.manager', 'projectManager')
      .where(
        new Brackets((builder) => {
          builder
            .where('project.code ILIKE :search', { search })
            .orWhere('project.name ILIKE :search', { search })
            .orWhere('projectClient.name ILIKE :search', { search })
            .orWhere('projectManager.username ILIKE :search', { search });
        }),
      )
      .addSelect(
        `CASE
          WHEN project.code ILIKE :exact OR project.name ILIKE :exact THEN 0
          WHEN project.code ILIKE :prefix OR project.name ILIKE :prefix THEN 1
          ELSE 2
        END`,
        'project_relevance',
      )
      .orderBy('project_relevance', 'ASC')
      .addOrderBy('project.updatedAt', 'DESC')
      .addOrderBy('project.id', 'DESC')
      .setParameters({ exact, prefix })
      .take(value.limit);

    const documentQuery = this.documentRepository
      .createQueryBuilder('document')
      .leftJoinAndSelect('document.folder', 'documentFolder')
      .where(
        new Brackets((builder) => {
          builder
            .where('document.title ILIKE :search', { search })
            .orWhere('document.content ILIKE :search', { search })
            .orWhere('documentFolder.name ILIKE :search', { search });
        }),
      )
      .addSelect(
        `CASE
          WHEN document.title ILIKE :exact THEN 0
          WHEN document.title ILIKE :prefix THEN 1
          ELSE 2
        END`,
        'document_relevance',
      )
      .orderBy('document_relevance', 'ASC')
      .addOrderBy('document.updatedAt', 'DESC')
      .addOrderBy('document.id', 'DESC')
      .setParameters({ exact, prefix })
      .take(value.limit);

    const scheduleQuery = this.scheduleRepository
      .createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.project', 'scheduleProject')
      .leftJoinAndSelect('scheduleProject.client', 'scheduleClient')
      .leftJoinAndSelect('schedule.category', 'scheduleCategory')
      .leftJoinAndSelect('schedule.user', 'scheduleUser')
      .where(
        new Brackets((builder) => {
          builder
            .where('schedule.summary ILIKE :search', { search })
            .orWhere('schedule.description ILIKE :search', { search })
            .orWhere('scheduleProject.code ILIKE :search', { search })
            .orWhere('scheduleProject.name ILIKE :search', { search })
            .orWhere('scheduleClient.name ILIKE :search', { search })
            .orWhere('scheduleCategory.name ILIKE :search', { search })
            .orWhere('scheduleUser.username ILIKE :search', { search });
        }),
      )
      .addSelect(
        `CASE
          WHEN schedule.summary ILIKE :exact THEN 0
          WHEN schedule.summary ILIKE :prefix THEN 1
          ELSE 2
        END`,
        'schedule_relevance',
      )
      .orderBy('schedule_relevance', 'ASC')
      .addOrderBy('schedule.start', 'DESC')
      .addOrderBy('schedule.id', 'DESC')
      .setParameters({ exact, prefix })
      .take(value.limit);

    const issueQuery = this.issueRepository
      .createQueryBuilder('issue')
      .leftJoinAndSelect('issue.project', 'issueProject')
      .leftJoinAndSelect('issueProject.client', 'issueClient')
      .leftJoinAndSelect('issue.category', 'issueCategory')
      .leftJoinAndSelect('issue.createdBy', 'issueCreatedBy')
      .where(
        new Brackets((builder) => {
          builder
            .where('issue.content ILIKE :search', { search })
            .orWhere('issueProject.code ILIKE :search', { search })
            .orWhere('issueProject.name ILIKE :search', { search })
            .orWhere('issueClient.name ILIKE :search', { search })
            .orWhere('issueCategory.name ILIKE :search', { search })
            .orWhere('issueCreatedBy.username ILIKE :search', { search });
        }),
      )
      .addSelect(
        `CASE
          WHEN issueProject.code ILIKE :exact OR issueCategory.name ILIKE :exact THEN 0
          WHEN issueProject.code ILIKE :prefix OR issueCategory.name ILIKE :prefix THEN 1
          ELSE 2
        END`,
        'issue_relevance',
      )
      .orderBy('issue_relevance', 'ASC')
      .addOrderBy('issue.updatedAt', 'DESC')
      .addOrderBy('issue.id', 'DESC')
      .setParameters({ exact, prefix })
      .take(value.limit);

    const reportQuery = this.reportRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.project', 'reportProject')
      .leftJoinAndSelect('reportProject.client', 'reportClient')
      .leftJoinAndSelect('report.schedule', 'reportSchedule')
      .leftJoinAndSelect('reportSchedule.category', 'reportScheduleCategory')
      .leftJoinAndSelect('report.createdBy', 'reportCreatedBy')
      .where(
        new Brackets((builder) => {
          builder
            .where('report.content ILIKE :search', { search })
            .orWhere('reportProject.code ILIKE :search', { search })
            .orWhere('reportProject.name ILIKE :search', { search })
            .orWhere('reportClient.name ILIKE :search', { search })
            .orWhere('reportSchedule.summary ILIKE :search', { search })
            .orWhere('reportScheduleCategory.name ILIKE :search', { search })
            .orWhere('reportCreatedBy.username ILIKE :search', { search });
        }),
      )
      .addSelect(
        `CASE
          WHEN reportProject.code ILIKE :exact OR reportSchedule.summary ILIKE :exact THEN 0
          WHEN reportProject.code ILIKE :prefix OR reportSchedule.summary ILIKE :prefix THEN 1
          ELSE 2
        END`,
        'report_relevance',
      )
      .orderBy('report_relevance', 'ASC')
      .addOrderBy('report.updatedAt', 'DESC')
      .addOrderBy('report.id', 'DESC')
      .setParameters({ exact, prefix })
      .take(value.limit);

    const [
      [projects, projectTotal],
      [documents, documentTotal],
      [schedules, scheduleTotal],
      [issues, issueTotal],
      [reports, reportTotal],
    ] = await Promise.all([
      projectQuery.getManyAndCount(),
      documentQuery.getManyAndCount(),
      scheduleQuery.getManyAndCount(),
      issueQuery.getManyAndCount(),
      reportQuery.getManyAndCount(),
    ]);

    return plainToInstance(
      DashboardSearchResultDto,
      {
        projects: {
          total: projectTotal,
          items: projects.map((project) => ({
            type: DashboardSearchItemType.Project,
            id: project.id,
            title: project.name,
            subtitle: [project.code, project.client?.name]
              .filter(Boolean)
              .join(' · '),
            projectId: project.id,
            projectCode: project.code,
            projectName: project.name,
            updatedAt: project.updatedAt,
          })),
        },
        documents: {
          total: documentTotal,
          items: documents.map((document) => ({
            type: DashboardSearchItemType.Document,
            id: document.id,
            title: document.title,
            subtitle: document.folder?.name,
            folderId: document.folder?.id,
            folderName: document.folder?.name,
            updatedAt: document.updatedAt,
          })),
        },
        schedules: {
          total: scheduleTotal,
          items: schedules.map((schedule) => ({
            type: DashboardSearchItemType.Schedule,
            id: schedule.id,
            title: schedule.summary,
            subtitle: [schedule.project?.code, schedule.project?.name]
              .filter(Boolean)
              .join(' · '),
            projectId: schedule.project?.id,
            projectCode: schedule.project?.code,
            projectName: schedule.project?.name,
            categoryId: schedule.category?.id,
            categoryName: schedule.category?.name,
            start: schedule.start,
            end: schedule.end,
            updatedAt: schedule.updatedAt,
          })),
        },
        issues: {
          total: issueTotal,
          items: issues.map((issue) => ({
            type: DashboardSearchItemType.Issue,
            id: issue.id,
            title: issue.category?.name,
            subtitle: [issue.project?.code, issue.project?.name]
              .filter(Boolean)
              .join(' · '),
            projectId: issue.project?.id,
            projectCode: issue.project?.code,
            projectName: issue.project?.name,
            categoryId: issue.category?.id,
            categoryName: issue.category?.name,
            categoryType: this.getIssueCategoryType(issue.category?.id),
            updatedAt: issue.updatedAt,
          })),
        },
        reports: {
          total: reportTotal,
          items: reports.map((report) => ({
            type: DashboardSearchItemType.Report,
            id: report.id,
            title: report.schedule?.summary ?? report.project?.name,
            subtitle: [report.project?.code, report.project?.name]
              .filter(Boolean)
              .join(' · '),
            projectId: report.project?.id,
            projectCode: report.project?.code,
            projectName: report.project?.name,
            categoryId: report.schedule?.category?.id,
            categoryName: report.schedule?.category?.name,
            updatedAt: report.updatedAt,
          })),
        },
      },
      { excludeExtraneousValues: true },
    );
  }

  async findProjectWithManagerId(id: number, start?: string, end?: string) {
    let queryBuilder = await this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.manager', 'manager')
      .leftJoinAndSelect('project.latestCategory', 'latestCategory')
      .leftJoinAndSelect('manager.rank', 'rank')
      .leftJoinAndSelect('manager.department', 'department')
      .leftJoinAndSelect('project.client', 'client')
      .where('manager.id = :id', { id });

    if (start) {
      queryBuilder.andWhere('project.createdAt >= :start', {
        start: `${dayjs(start).format('YYYY-MM-DD')} 00:00:00`,
      });
    }
    if (end) {
      queryBuilder.andWhere('project.createdAt <= :end', {
        end: `${dayjs(end).format('YYYY-MM-DD')} 23:59:59`,
      });
    }

    return queryBuilder.getManyAndCount();
  }

  async findAllProjectCount(value: GetProjectSummaryDto) {
    let queryBuilder =
      await this.projectRepository.createQueryBuilder('project');

    if (value.start) {
      queryBuilder.andWhere('project.createdAt >= :start', {
        start: `${dayjs(value.start).format('YYYY-MM-DD')} 00:00:00`,
      });
    }
    if (value.end) {
      queryBuilder.andWhere('project.createdAt <= :end', {
        end: `${dayjs(value.end).format('YYYY-MM-DD')} 23:59:59`,
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
        start: `${dayjs(value.start).format('YYYY-MM-DD')} 00:00:00`,
      });
    }
    if (value.end) {
      queryBuilder.andWhere('project.createdAt <= :end', {
        end: `${dayjs(value.end).format('YYYY-MM-DD')} 23:59:59`,
      });
    }

    return queryBuilder.getCount();
  }

  async findPreexecutedProjectCount(value: GetProjectSummaryDto) {
    let queryBuilder = this.projectRepository
      .createQueryBuilder('project')
      .where('project.isPreexecuted = true')
      .andWhere('project.isClosed = false');

    if (value.start) {
      queryBuilder.andWhere('project.createdAt >= :start', {
        start: `${dayjs(value.start).format('YYYY-MM-DD')} 00:00:00`,
      });
    }
    if (value.end) {
      queryBuilder.andWhere('project.createdAt <= :end', {
        end: `${dayjs(value.end).format('YYYY-MM-DD')} 23:59:59`,
      });
    }

    return queryBuilder.getCount();
  }

  async findActiveProjectCount(value: GetProjectSummaryDto) {
    let queryBuilder = await this.projectRepository
      .createQueryBuilder('project')
      .where('project.isClosed = false');

    if (value.start) {
      queryBuilder.andWhere('project.createdAt >= :start', {
        start: `${dayjs(value.start).format('YYYY-MM-DD')} 00:00:00`,
      });
    }
    if (value.end) {
      queryBuilder.andWhere('project.createdAt <= :end', {
        end: `${dayjs(value.end).format('YYYY-MM-DD')} 23:59:59`,
      });
    }

    return queryBuilder.getCount();
  }

  async findTodaySchedules(today: Date, tomorrow: Date) {
    return await this.scheduleRepository
      .createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.project', 'project')
      .leftJoinAndSelect('project.client', 'client')
      .leftJoinAndSelect('schedule.category', 'category')
      .leftJoinAndSelect('schedule.user', 'user')
      .where('schedule.start <= :tomorrow AND schedule.end >= :today', {
        today,
        tomorrow,
      })
      .orderBy('schedule.start', 'ASC')
      .getMany();
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
    const preexecuted = await this.findPreexecutedProjectCount(value);
    const active = await this.findActiveProjectCount(value);

    return plainToInstance(ProjectSummaryDto, {
      total: total,
      closed: closed,
      preexecuted: preexecuted,
      active: active,
    });
  }

  async getTodaySchedules() {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 자정으로 시간 초기화
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1); // 다음 날 자정

    const schedules = await this.findTodaySchedules(today, tomorrow);

    const result = await Promise.all(
      schedules.map(async (schedule) => {
        const scheduleDto = plainToInstance(
          TodayScheduleDto,
          {
            summary: schedule.summary,
            category: schedule.category,
            start: schedule.start.toISOString().split('T')[0],
            end: schedule.end.toISOString().split('T')[0],
            projectClientName: schedule.project.client.name,
            user: schedule.user,
          },
          {
            excludeExtraneousValues: true,
          },
        );

        return scheduleDto;
      }),
    );

    return result;
  }
}

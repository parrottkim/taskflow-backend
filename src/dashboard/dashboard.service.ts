import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Project } from 'src/entity/project/project.entity';
import { Schedule } from 'src/entity/schedule/schedule.entity';
import { Repository } from 'typeorm';
import { GetProjectStatsDto } from './dto/get-project-stats';
import { GetProjectSummaryDto } from './dto/get-project-summary';
import { plainToInstance } from 'class-transformer';
import { ProjectStatsDto, ProjectStatsListDto } from './dto/project-stats';
import { ProjectSummaryDto } from './dto/project-summary';
import { UserService } from 'src/user/user.service';
import * as dayjs from 'dayjs';
import { TodayScheduleDto } from './dto/today-schedule';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Schedule)
    private readonly scheduleRepository: Repository<Schedule>,
    private userService: UserService,
  ) {}

  async findProjectWithManagerId(id: number, start?: string, end?: string) {
    let queryBuilder = await this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.manager', 'manager')
      .leftJoinAndSelect('project.latestCategory', 'latestCategory')
      .leftJoinAndSelect('manager.position', 'position')
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

  async findKickedOffProjectCount(value: GetProjectSummaryDto) {
    let queryBuilder = this.projectRepository
      .createQueryBuilder('project')
      .innerJoin('project.issues', 'issue')
      .innerJoin('issue.kickoff', 'kickoff')
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
    const kickedOff = await this.findKickedOffProjectCount(value);
    const active = await this.findActiveProjectCount(value);

    return plainToInstance(ProjectSummaryDto, {
      total: total,
      closed: closed,
      kickedOff: kickedOff,
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

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { CreateScheduleDto } from './dto/create-schedule';
import { plainToInstance } from 'class-transformer';
import { ScheduleDto, ScheduleGroupDto, ScheduleListDto } from './dto/schedule';
import { ProjectService } from '@/project/project.service';
import { InjectRepository } from '@nestjs/typeorm';
import { ScheduleCategory } from '@/entity/schedule/schedule-category.entity';
import { DataSource, EntityManager, IsNull, Repository } from 'typeorm';
import { User } from '@/entity/user/user.entity';
import { assertWriteAccess } from '@/common/policies/write-access.policy';
import { assertOwnerOrAdmin } from '@/common/policies/resource-access.policy';
import { ScheduleCategoryDto } from './dto/schedule-category';
import { Schedule } from '@/entity/schedule/schedule.entity';
import { UpdateScheduleDto } from './dto/update-schedule';
import { GetSchedulesDto } from './dto/get-schedules';
import { MailService } from '@/mail/mail.service';
import dayjs from 'dayjs';
import { Project } from '@/entity/project/project.entity';
import { ProjectClientService } from '@/project/project-client.service';
import { ProjectDto } from '@/project/dto/project';
import { UserDepartmentClosure } from '@/entity/user/user-department-closure.entity';
import { Report } from '@/entity/report/report.entity';
import { ScheduleHoliday } from '@/entity/schedule/schedule-holiday.entity';
import { HolidayService } from '@/holiday/holiday.service';
import { UpdateScheduleHolidayDto } from './dto/update-schedule-holiday';
import { randomUUID } from 'crypto';
import {
  ScheduleCalendarSync,
  ScheduleCalendarSyncOperation,
} from '@/entity/schedule/schedule-calendar-sync.entity';
import { ScheduleCalendarEventPayload } from './schedule-calendar.types';
import { HolidayDto } from '@/holiday/dto/holiday';

@Injectable()
export class ScheduleService {
  private readonly logger = new Logger(ScheduleService.name);

  private toScheduleDate(value: string | Date): Date {
    return new Date(`${dayjs(value).format('YYYY-MM-DD')}T00:00:00.000Z`);
  }

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Schedule)
    private readonly scheduleRepository: Repository<Schedule>,
    @InjectRepository(ScheduleCategory)
    private readonly scheduleCategoryRepository: Repository<ScheduleCategory>,
    @InjectRepository(UserDepartmentClosure)
    private readonly userDepartmentClosureRepository: Repository<UserDepartmentClosure>,
    private readonly projectService: ProjectService,
    private readonly projectClientService: ProjectClientService,
    private readonly mailService: MailService,
    private readonly holidayService: HolidayService,
  ) {}

  private buildCalendarEventPayload(
    schedule: Schedule,
    project: Project,
    category: ScheduleCategory,
    owner: User,
  ): ScheduleCalendarEventPayload {
    return {
      summary: `[${category.name}][${project.client.name}][${owner.username}] ${schedule.summary} (${dayjs(schedule.start).format('MM/DD')} - ${dayjs(schedule.end).format('MM/DD')})`,
      description:
        `[URL] ${schedule.url}` +
        `\n\n[설명]\n${schedule.description ?? '설명 없음'}`,
      location: project.client.name,
      colorId: category.color,
      start: {
        date: dayjs(schedule.start).format('YYYY-MM-DD'),
      },
      end: {
        date: dayjs(schedule.end).add(1, 'day').format('YYYY-MM-DD'),
      },
      extendedProperties: {
        shared: {
          categoryId: category.id.toString(),
          owner: owner.email,
        },
      },
    };
  }

  private enqueueCalendarSync(
    manager: EntityManager,
    schedule: Schedule,
    operation: ScheduleCalendarSyncOperation,
    payload: ScheduleCalendarEventPayload = {} as ScheduleCalendarEventPayload,
  ) {
    return manager.save(
      manager.create(ScheduleCalendarSync, {
        schedule,
        operation,
        eventId: schedule.eventId,
        payload,
      }),
    );
  }

  async findCategoryById(id: number) {
    return await this.scheduleCategoryRepository.findOneBy({ id });
  }

  private resolveScheduleDaysOff(
    categoryId: number,
    start: Date | string,
    end: Date | string,
  ) {
    return categoryId === 1
      ? this.holidayService.getDaysOffBetween(start, end)
      : Promise.resolve([] as HolidayDto[]);
  }

  private async syncScheduleHolidays(
    manager: EntityManager,
    schedule: Schedule,
    daysOff: HolidayDto[],
    holidayInputs?: UpdateScheduleHolidayDto[],
  ): Promise<ScheduleHoliday[]> {
    await manager.delete(ScheduleHoliday, {
      schedule: { id: schedule.id },
    });

    if (schedule.category.id !== 1) {
      if (holidayInputs?.length) {
        throw new BadRequestException(
          'bad_request_schedule_holidays_not_allowed',
        );
      }

      return [];
    }

    const inputs = holidayInputs ?? [];
    const inputByDate = new Map(
      inputs.map((holiday) => [
        dayjs(holiday.date).format('YYYY-MM-DD'),
        holiday,
      ]),
    );

    if (holidayInputs) {
      const expectedDates = new Set(
        daysOff.map((dayOff) => dayjs(dayOff.date).format('YYYY-MM-DD')),
      );
      const hasInvalidDates =
        inputByDate.size !== inputs.length ||
        inputs.some(
          (holiday) =>
            !expectedDates.has(dayjs(holiday.date).format('YYYY-MM-DD')),
        );

      if (hasInvalidDates) {
        throw new BadRequestException(
          'bad_request_schedule_holiday_dates_invalid',
        );
      }

      const compensatoryLeaveDates = inputs
        .map((holiday) => holiday.compensatoryLeaveDate)
        .filter((date): date is Date => Boolean(date))
        .map((date) => dayjs(date).format('YYYY-MM-DD'));

      if (
        new Set(compensatoryLeaveDates).size !== compensatoryLeaveDates.length
      ) {
        throw new BadRequestException(
          'bad_request_compensatory_leave_date_duplicate',
        );
      }
    }

    const selectedDaysOff = holidayInputs
      ? daysOff.filter((dayOff) =>
          inputByDate.has(dayjs(dayOff.date).format('YYYY-MM-DD')),
        )
      : daysOff;
    const holidays = selectedDaysOff.map((dayOff) => {
      const date = dayjs(dayOff.date).format('YYYY-MM-DD');
      const input = inputByDate.get(date);

      return manager.create(ScheduleHoliday, {
        schedule,
        type:
          dayOff.name === '토요일' || dayOff.name === '일요일'
            ? 'WEEKEND'
            : 'PUBLIC_HOLIDAY',
        date: new Date(`${date}T00:00:00.000Z`),
        name: dayOff.name,
        isTravelOnly: input?.isTravelOnly ?? false,
        compensatoryLeaveDate: input?.compensatoryLeaveDate
          ? dayjs(input.compensatoryLeaveDate).toDate()
          : undefined,
      });
    });

    return holidays.length > 0 ? manager.save(holidays) : [];
  }

  async findAllCategories() {
    return await this.scheduleCategoryRepository
      .createQueryBuilder('category')
      .orderBy('category.id', 'ASC')
      .getMany();
  }

  async findScheduleById(id: number) {
    return await this.scheduleRepository
      .createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.project', 'project')
      .leftJoinAndSelect('schedule.category', 'category')
      .leftJoinAndSelect('schedule.user', 'user')
      .leftJoinAndSelect('schedule.holidays', 'holiday')
      .leftJoinAndSelect(
        'schedule.reports',
        'report',
        'report.deletedAt IS NULL',
      )
      .where('schedule.id = :id', { id })
      .orderBy('holiday.date', 'ASC')
      .getOne();
  }

  async findSchedules(user: User, value: GetSchedulesDto) {
    // const queryBuilder = this.scheduleRepository
    //   .createQueryBuilder('schedule')
    //   .leftJoinAndSelect('schedule.project', 'project')
    //   .leftJoinAndSelect('schedule.category', 'category')
    //   .leftJoinAndSelect('schedule.user', 'user')
    //   .where('project.id = :projectId', { projectId: value.projectId })
    //   .andWhere('user.id = :userId', { userId: user.id });
    // // 방향에 따라 쿼리 조건 다르게 설정
    // if (value.lastStart) {
    //   if (value.isBackward) {
    //     queryBuilder
    //       .andWhere(
    //         '(schedule.start < :lastStart OR (schedule.start = :lastStart AND schedule.id < :lastId))',
    //         { lastStart: value.lastStart, lastId: value.lastId },
    //       )
    //       .orderBy('schedule.start', 'DESC')
    //       .addOrderBy('schedule.id', 'DESC');
    //   } else {
    //     queryBuilder
    //       .andWhere(
    //         '(schedule.start > :lastStart OR (schedule.start = :lastStart AND schedule.id > :lastId))',
    //         { lastStart: value.lastStart, lastId: value.lastId },
    //       )
    //       .orderBy('schedule.start', 'ASC')
    //       .addOrderBy('schedule.id', 'ASC');
    //   }
    // } else {
    //   // 초기 로드 → 오늘 이후 일정
    //   const today = new Date();
    //   today.setHours(0, 0, 0, 0);
    //   queryBuilder
    //     .andWhere('schedule.end >= :today', { today })
    //     .orderBy('schedule.start', 'ASC');
    // }
    // return await queryBuilder.take(value.limit + 1).getMany();
  }

  async getAllCategories() {
    const categories = await this.findAllCategories();

    const transformedCategories = categories.map((category) => {
      let type;

      if (category.id === 1) {
        type = 'domestic';
      } else if (category.id === 2) {
        type = 'overseas';
      } else {
        type = 'center';
      }

      return {
        type: type,
        id: category.id,
        name: category.name,
        color: category.color,
      };
    });

    const result = plainToInstance(ScheduleCategoryDto, transformedCategories, {
      excludeExtraneousValues: true,
    });

    return result;
  }

  async getSchedule(id: number) {
    const schedule = await this.findScheduleById(id);

    // findScheduleById 내부에서 예외 처리를 하지 않는 경우를 대비한 방어 코드
    if (!schedule) {
      throw new NotFoundException('not_found_schedule');
    }

    const project = await this.projectService.getProjectWithoutUser(
      schedule.project.id,
    );

    const scheduleDto = plainToInstance(ScheduleDto, schedule, {
      excludeExtraneousValues: true,
    });

    scheduleDto.projectId = project.id;
    scheduleDto.projectCode = project.code;
    scheduleDto.projectName = project.name;
    scheduleDto.projectClientId = project.clients[0].id;
    scheduleDto.projectClientName =
      project.clients[project.clients.length - 1].name;

    return scheduleDto;
  }

  async getScheduleWithUsers(query: GetSchedulesDto) {
    const start = query.start
      ? dayjs(query.start).startOf('day')
      : dayjs().subtract(28, 'day').startOf('day');
    const end = query.end
      ? dayjs(query.end).endOf('day')
      : dayjs().add(28, 'day').endOf('day');

    let queryBuilder = this.scheduleRepository
      .createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.project', 'project')
      .leftJoinAndSelect('project.client', 'client')
      .leftJoinAndSelect('schedule.category', 'category')
      .leftJoinAndSelect('schedule.user', 'user')
      .leftJoinAndSelect('user.department', 'department')
      .leftJoinAndSelect('schedule.holidays', 'holiday')
      .leftJoinAndSelect(
        'schedule.reports',
        'report',
        'report.deletedAt IS NULL',
      );

    if (query.userId) {
      queryBuilder = queryBuilder.andWhere('user.id = :userId', {
        userId: query.userId,
      });
    }

    if (query.departmentId) {
      const closures = await this.userDepartmentClosureRepository.find({
        where: { ancestor: query.departmentId },
      });
      const departmentIds = closures.length
        ? closures.map((closure) => closure.descendant)
        : [query.departmentId];

      queryBuilder = queryBuilder.andWhere(
        'department.id IN (:...departmentIds)',
        {
          departmentIds,
        },
      );
    }

    if (query.search) {
      queryBuilder = queryBuilder.andWhere(
        '(schedule.summary ILIKE :search OR schedule.description ILIKE :search)',
        {
          search: `%${query.search}%`,
        },
      );
    }

    // value.projectId가 있을 때만 필터링 조건을 추가합니다.
    if (query.projectId) {
      queryBuilder = queryBuilder.andWhere('project.id = :projectId', {
        projectId: query.projectId,
      });
    }

    const eventsQueryBuilder = queryBuilder
      .clone()
      .andWhere('schedule.start <= :end AND schedule.end >= :start', {
        start: start.toDate(),
        end: end.toDate(),
      })
      .orderBy('schedule.start', 'ASC')
      .addOrderBy('schedule.id', 'ASC')
      .addOrderBy('holiday.date', 'ASC');

    const previousQueryBuilder = queryBuilder
      .clone()
      .andWhere('schedule.end < :start', { start: start.toDate() });

    const nextQueryBuilder = queryBuilder
      .clone()
      .andWhere('schedule.start > :end', { end: end.toDate() });

    const [events, hasPrevious, hasNext] = await Promise.all([
      eventsQueryBuilder.getMany(),
      previousQueryBuilder.getExists(),
      nextQueryBuilder.getExists(),
    ]);

    const clientIds = [
      ...new Set(events.map((schedule) => schedule.project.client.id)),
    ];
    const ancestorGroups =
      await this.projectClientService.findAllAncestors(clientIds);
    const ancestorsByClientId = new Map(
      ancestorGroups.map(({ descendantId, ancestors }) => [
        descendantId,
        ancestors,
      ]),
    );

    const items = events.map((schedule) => {
      const project = schedule.project;
      const clients = ancestorsByClientId.get(project.client.id) ?? [
        project.client,
      ];
      const scheduleDto = plainToInstance(ScheduleDto, schedule, {
        excludeExtraneousValues: true,
      });
      scheduleDto.projectId = project.id;
      scheduleDto.projectCode = project.code;
      scheduleDto.projectName = project.name;
      scheduleDto.projectClientId = clients[0].id;
      scheduleDto.projectClientName = clients[clients.length - 1].name;

      return scheduleDto;
    });

    const grouped = {};

    for (const event of items) {
      const startDate = dayjs(event.start).startOf('day');
      const endDate = dayjs(event.end).endOf('day');

      for (
        let d = startDate;
        d.isBefore(endDate) || d.isSame(endDate, 'day');
        d = d.add(1, 'day')
      ) {
        const dateKey = d.format('YYYY-MM-DD');
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(event);
      }
    }

    const groupedItems = Object.entries(grouped).map(
      ([dateKey, scheduleDtos]) =>
        plainToInstance(
          ScheduleGroupDto,
          {
            date: dateKey,
            items: scheduleDtos,
          },
          {
            excludeExtraneousValues: true,
          },
        ),
    );

    const scheduleListDto = plainToInstance(ScheduleListDto, {
      items: groupedItems,
      hasNext: hasNext,
      hasPrevious: hasPrevious,
    });

    return scheduleListDto;
  }

  async createSchedule(user: User, body: CreateScheduleDto) {
    assertWriteAccess(user);
    const scheduleDaysOff = await this.resolveScheduleDaysOff(
      body.categoryId,
      body.start,
      body.end,
    );
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let saved: Schedule;
    let project: Project;
    let ancestors: Awaited<ReturnType<ProjectClientService['findAncestors']>>;

    try {
      project = await queryRunner.manager.findOne(Project, {
        where: { id: body.projectId },
        relations: ['client'],
      });
      const category = await queryRunner.manager.findOne(ScheduleCategory, {
        where: { id: body.categoryId },
      });

      if (!project) throw new NotFoundException('not_found_project');
      if (!category) throw new NotFoundException('not_found_schedule_category');

      saved = queryRunner.manager.create(Schedule, {
        eventId: `taskfl0${randomUUID().replace(/-/g, '')}`,
        category,
        project,
        user,
        summary: body.summary,
        description: body.description,
        url: body.url,
        start: this.toScheduleDate(body.start),
        end: this.toScheduleDate(body.end),
      });

      saved = await queryRunner.manager.save(saved);
      saved.holidays = await this.syncScheduleHolidays(
        queryRunner.manager,
        saved,
        scheduleDaysOff,
        body.holidays,
      );
      await this.enqueueCalendarSync(
        queryRunner.manager,
        saved,
        ScheduleCalendarSyncOperation.CREATE,
        this.buildCalendarEventPayload(saved, project, category, user),
      );

      ancestors = await this.projectClientService.findAncestors(
        project.client.id,
      );

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }

    const scheduleDto = plainToInstance(
      ScheduleDto,
      {
        ...saved,
        projectId: project.id,
        projectCode: project.code,
        projectName: project.name,
        projectClientId: ancestors[0].id,
        projectClientName: project.client.name,
      },
      {
        excludeExtraneousValues: true,
      },
    );
    const projectDto = plainToInstance(
      ProjectDto,
      {
        ...project,
        clients: ancestors,
      },
      {
        excludeExtraneousValues: true,
      },
    );

    try {
      await this.mailService.sendScheduleMail(projectDto, scheduleDto);
    } catch (error) {
      this.logger.warn(
        `일정 생성 메일 발송 실패: scheduleId=${saved.id}`,
        error instanceof Error ? error.stack : String(error),
      );
    }

    return scheduleDto;
  }

  async updateSchedule(user: User, id: number, body: UpdateScheduleDto) {
    assertWriteAccess(user);
    const scheduleSnapshot = await this.scheduleRepository.findOne({
      where: { id },
      relations: ['user', 'category'],
    });
    if (!scheduleSnapshot) {
      throw new NotFoundException('not_found_schedule');
    }
    assertOwnerOrAdmin(user, scheduleSnapshot.user.id);

    const scheduleDaysOff =
      body.holidays !== undefined
        ? await this.resolveScheduleDaysOff(
            body.categoryId ?? scheduleSnapshot.category.id,
            body.start ?? scheduleSnapshot.start,
            body.end ?? scheduleSnapshot.end,
          )
        : [];
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let updatedSchedule: Schedule;
    let project: Project;
    let category: ScheduleCategory;
    let ancestors: Awaited<ReturnType<ProjectClientService['findAncestors']>>;

    try {
      const schedule = await queryRunner.manager.findOne(Schedule, {
        where: { id },
        relations: ['user', 'project', 'category', 'holidays'],
        order: { holidays: { date: 'ASC' } },
      });

      if (!schedule) {
        throw new NotFoundException('not_found_schedule');
      }

      assertOwnerOrAdmin(user, schedule.user.id);

      // 보고서 생성 후에는 출장 기간, 구분, 출장자가 계산 근거가 되므로
      // 연결된 활성 보고서가 있는 스케줄은 수정할 수 없다.
      const hasActiveReport = await queryRunner.manager.exists(Report, {
        where: {
          schedule: { id: schedule.id },
          deletedAt: IsNull(),
        },
      });

      if (hasActiveReport) {
        throw new ConflictException('conflict_schedule_report_exists');
      }

      project = await queryRunner.manager.findOne(Project, {
        where: { id: body.projectId ?? schedule.project.id },
        relations: ['client'],
      });
      category = await queryRunner.manager.findOne(ScheduleCategory, {
        where: { id: body.categoryId ?? schedule.category.id },
      });

      if (!project) throw new NotFoundException('not_found_project');
      if (!category) throw new NotFoundException('not_found_schedule_category');

      updatedSchedule = await queryRunner.manager.save(Schedule, {
        id: schedule.id,
        eventId: schedule.eventId,
        summary: body.summary ?? schedule.summary,
        description: body.description ?? schedule.description,
        url: body.url ?? schedule.url,
        start: body.start ? this.toScheduleDate(body.start) : schedule.start,
        end: body.end ? this.toScheduleDate(body.end) : schedule.end,
        project: project,
        category: category,
        user: schedule.user,
      });
      updatedSchedule.holidays =
        body.holidays !== undefined
          ? await this.syncScheduleHolidays(
              queryRunner.manager,
              updatedSchedule,
              scheduleDaysOff,
              body.holidays,
            )
          : schedule.holidays;

      await this.enqueueCalendarSync(
        queryRunner.manager,
        updatedSchedule,
        ScheduleCalendarSyncOperation.UPDATE,
        this.buildCalendarEventPayload(
          updatedSchedule,
          project,
          category,
          schedule.user,
        ),
      );

      ancestors = await this.projectClientService.findAncestors(
        project.client.id,
      );

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }

    return plainToInstance(
      ScheduleDto,
      {
        ...updatedSchedule,
        projectId: project.id,
        projectCode: project.code,
        projectName: project.name,
        projectClientId: ancestors[0].id,
        projectClientName: project.client.name,
        category,
      },
      { excludeExtraneousValues: true },
    );
  }

  async deleteSchedule(user: User, id: number) {
    assertWriteAccess(user);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const schedule = await queryRunner.manager.findOne(Schedule, {
        where: { id },
        select: ['id', 'eventId'],
      });

      if (!schedule) {
        throw new NotFoundException('not_found_schedule');
      }

      // 보고서의 계산 근거와 이력을 보존하기 위해 활성 보고서가 연결된
      // 스케줄은 삭제할 수 없다.
      const hasActiveReport = await queryRunner.manager.exists(Report, {
        where: {
          schedule: { id: schedule.id },
          deletedAt: IsNull(),
        },
      });

      if (hasActiveReport) {
        throw new ConflictException('conflict_schedule_report_exists');
      }

      await this.enqueueCalendarSync(
        queryRunner.manager,
        schedule,
        ScheduleCalendarSyncOperation.DELETE,
      );

      await queryRunner.manager.softDelete(Schedule, id);

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}

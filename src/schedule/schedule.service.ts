import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { google, calendar_v3 } from 'googleapis';
import { join } from 'path';
import { ConfigType } from '@nestjs/config';
import config from '@/config/config';
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

@Injectable()
export class ScheduleService {
  private calendarClient: calendar_v3.Calendar;
  private readonly scheduleCalendarId: string;

  private toScheduleDate(value: string | Date): Date {
    return new Date(`${dayjs(value).format('YYYY-MM-DD')}T00:00:00.000Z`);
  }

  constructor(
    private readonly dataSource: DataSource,
    @Inject(config.KEY)
    private readonly configService: ConfigType<typeof config>,
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
  ) {
    const credentialsPath = this.configService.calendar.credentialsPath;
    this.scheduleCalendarId = this.configService.calendar.scheduleCalendarId;

    const auth = new google.auth.GoogleAuth({
      keyFile: join(process.cwd(), credentialsPath),
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });

    this.calendarClient = google.calendar({ version: 'v3', auth });
  }

  async findCategoryById(id: number) {
    return await this.scheduleCategoryRepository.findOneBy({ id });
  }

  private async syncScheduleHolidays(
    manager: EntityManager,
    schedule: Schedule,
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

    const daysOff = await this.holidayService.getDaysOffBetween(
      schedule.start,
      schedule.end,
    );
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
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const project = await queryRunner.manager.findOne(Project, {
        where: { id: body.projectId },
        relations: ['client'], // 클라이언트 정보가 필요하므로 relations를 포함해야 함
      });
      const category = await queryRunner.manager.findOne(ScheduleCategory, {
        where: { id: body.categoryId },
      });

      const summary = `[${category.name}][${project.client.name}][${user.username}] ${body.summary} (${dayjs(body.start).format('MM/DD')} - ${dayjs(body.end).format('MM/DD')})`;
      const description =
        `[URL] ${body.url}` + `\n\n[설명]\n${body.description ?? '설명 없음'}`;

      const res = await this.calendarClient.events.insert({
        calendarId: this.scheduleCalendarId,
        requestBody: {
          summary: summary,
          description: description,
          location: project.client.name,
          colorId: category.color,
          start: {
            date: dayjs(body.start).format('YYYY-MM-DD'),
          },
          end: {
            date: dayjs(body.end).add(1, 'day').format('YYYY-MM-DD'),
          },
          extendedProperties: {
            shared: {
              categoryId: category.id.toString(),
              owner: user.email,
            },
          },
        },
      });

      const eventId = res.data.id;

      const saved = await queryRunner.manager.create(Schedule, {
        eventId,
        category,
        project,
        user,
        summary: body.summary,
        description: body.description,
        url: body.url,
        start: this.toScheduleDate(body.start),
        end: this.toScheduleDate(body.end),
      });

      await queryRunner.manager.save(saved);
      saved.holidays = await this.syncScheduleHolidays(
        queryRunner.manager,
        saved,
        body.holidays,
      );

      const ancestors = await this.projectClientService.findAncestors(
        project.client.id,
      );

      await queryRunner.commitTransaction();

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

      await this.mailService.sendScheduleMail(projectDto, scheduleDto);

      return scheduleDto;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // DataSource를 DI 받았다고 가정 (this.dataSource)
  async updateSchedule(user: User, id: number, body: UpdateScheduleDto) {
    assertWriteAccess(user);
    // ⬇️ 트랜잭션 시작
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1️⃣ 기존 스케줄 조회 (queryRunner.manager 사용)
      // 기존 schedule 조회 로직을 queryRunner.manager.findOne을 사용하도록 수정하는 것이 일관적입니다.
      // 하지만 기존 로직(this.findScheduleById)이 트랜잭션 외부에서 작동한다면,
      // 조회만 외부에서 하고, 수정 및 저장만 트랜잭션 내에서 처리할 수도 있습니다.
      // 여기서는 안전하게 트랜잭션 내에서 조회하도록 가정합니다.
      const schedule = await queryRunner.manager.findOne(Schedule, {
        where: { id },
        relations: ['user', 'project', 'category', 'holidays'],
        order: { holidays: { date: 'ASC' } },
      });

      if (!schedule) {
        await queryRunner.rollbackTransaction(); // 롤백
        throw new NotFoundException('not_found_schedule');
      }

      // 2️⃣ 권한 체크
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

      // 3️⃣ 새 프로젝트/카테고리 값 처리 (queryRunner.manager 사용)
      let projectId = body.projectId ?? schedule.project.id;
      let categoryId = body.categoryId ?? schedule.category.id;

      // Project/Category 조회도 queryRunner.manager 사용
      const project = await queryRunner.manager.findOne(Project, {
        where: { id: body.projectId ?? schedule.project.id },
        relations: ['client'],
      });
      const category = await queryRunner.manager.findOne(ScheduleCategory, {
        where: { id: body.categoryId ?? schedule.category.id },
      });
      const summary = `[${category.name}][${project.client.name}][${user.username}] ${body.summary} (${dayjs(body.start).format('MM/DD')} - ${dayjs(body.end).format('MM/DD')})`;
      const description =
        `[URL] ${body.url}` + `\n\n[설명]\n${body.description ?? '설명 없음'}`;

      const eventBody: calendar_v3.Schema$Event = {
        // summary: summary ?? schedule.summary, // summary는 위에서 새로 만들었으므로
        summary: summary,
        // description: description ?? schedule.description, // description도 위에서 새로 만들었으므로
        description: description,
        location: project.client.name,
        colorId: category.color,
        start: {
          date: dayjs(body.start ?? schedule.start).format('YYYY-MM-DD'),
        },
        end: {
          date: dayjs(body.end ?? schedule.end)
            .add(1, 'day')
            .format('YYYY-MM-DD'),
        },
        extendedProperties: {
          shared: {
            categoryId: category.id.toString(),
            owner: user.email,
          },
        },
      };

      let newEventId = schedule.eventId;

      // 4️⃣ Google Calendar 이벤트 업데이트 시도
      try {
        await this.calendarClient.events.update({
          calendarId: this.scheduleCalendarId,
          eventId: schedule.eventId,
          requestBody: eventBody,
        });
      } catch (error: any) {
        // 이벤트가 존재하지 않으면 새로 생성
        if (error.code === 404) {
          const res = await this.calendarClient.events.insert({
            calendarId: this.scheduleCalendarId,
            requestBody: eventBody,
          });
          newEventId = res.data.id;
        } else {
          // 기타 오류 발생 시 트랜잭션 롤백 후 예외 던지기
          await queryRunner.rollbackTransaction();
          throw error;
        }
      }

      // 5️⃣ DB 업데이트 (queryRunner.manager.save 사용)
      const updatedSchedule = await queryRunner.manager.save(Schedule, {
        // scheduleRepository 대신 queryRunner.manager 사용
        id: schedule.id,
        eventId: newEventId,
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
              body.holidays,
            )
          : schedule.holidays;

      // 6️⃣ DTO 반환 전 커밋
      await queryRunner.commitTransaction(); // ⬇️ 커밋

      const ancestors = await this.projectClientService.findAncestors(
        project.client.id,
      );

      // DTO 생성 및 메일 발송 로직 (트랜잭션 외부에서도 가능하지만, 로직 흐름상 여기에 위치)
      const scheduleDto = plainToInstance(
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

      return scheduleDto;
    } catch (err) {
      // 오류 발생 시 롤백
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      // 연결 해제
      await queryRunner.release();
    }
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

      // 2️⃣ Google Calendar 이벤트 삭제
      try {
        await this.calendarClient.events.delete({
          calendarId: this.scheduleCalendarId,
          eventId: schedule.eventId,
        });
      } catch (error: any) {
        if (error.code !== 404 && error.code !== 410) {
          console.error(
            `Google Calendar Event Deletion Error: ${error.message}`,
          );
          throw error;
        }
      }

      // 3️⃣ DB에서 Schedule 논리적 삭제 (softDelete)
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

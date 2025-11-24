import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { google, calendar_v3 } from 'googleapis';
import { join } from 'path';
import { ConfigType } from '@nestjs/config';
import config from 'config';
import { CreateScheduleDto } from './dto/create-schedule';
import { plainToInstance } from 'class-transformer';
import { ScheduleDto, ScheduleGroupDto, ScheduleListDto } from './dto/schedule';
import { ProjectService } from 'src/project/project.service';
import { InjectRepository } from '@nestjs/typeorm';
import { ScheduleCategory } from 'src/entity/schedule/schedule-category.entity';
import { Repository } from 'typeorm';
import { User } from 'src/entity/user/user.entity';
import { ScheduleCategoryDto } from './dto/schedule-category';
import { Schedule } from 'src/entity/schedule/schedule.entity';
import { UpdateScheduleDto } from './dto/update-schedule';
import { GetSchedulesDto } from './dto/get-schedules';
import { MailService } from 'src/mail/mail.service';
import * as dayjs from 'dayjs';
import { ProjectClientService } from 'src/project/project-client.service';

@Injectable()
export class ScheduleService {
  private calendarClient: calendar_v3.Calendar;
  private readonly scheduleCalendarId: string;

  constructor(
    @Inject(config.KEY)
    private readonly configService: ConfigType<typeof config>,
    @InjectRepository(Schedule)
    private readonly scheduleRepository: Repository<Schedule>,
    @InjectRepository(ScheduleCategory)
    private readonly scheduleCategoryRepository: Repository<ScheduleCategory>,
    private readonly projectService: ProjectService,
    private readonly mailService: MailService,
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

  async findAllCategories() {
    return await this.scheduleCategoryRepository
      .createQueryBuilder('category')
      .orderBy('category.id', 'ASC')
      .getMany();
  }

  async findTodaySchedules(today: Date, tomorrow: Date) {
    return await this.scheduleRepository
      .createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.project', 'project')
      .leftJoinAndSelect('schedule.category', 'category')
      .leftJoinAndSelect('schedule.user', 'user')
      .where('schedule.start <= :tomorrow AND schedule.end >= :today', {
        today,
        tomorrow,
      })
      .orderBy('schedule.start', 'ASC')
      .getMany();
  }

  async findScheduleById(id: number) {
    return await this.scheduleRepository
      .createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.project', 'project')
      .leftJoinAndSelect('schedule.category', 'category')
      .leftJoinAndSelect('schedule.user', 'user')
      .where('schedule.id = :id', { id })
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

  async getTodaySchedules() {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 자정으로 시간 초기화
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1); // 다음 날 자정

    const schedules = await this.findTodaySchedules(today, tomorrow);

    const result = await Promise.all(
      schedules.map(async (schedule) => {
        const project = await this.projectService.getProjectWithoutUser(
          schedule.project.id,
        );

        const scheduleDto = plainToInstance(
          ScheduleDto,
          {
            ...schedule,
          },
          { excludeExtraneousValues: true },
        );

        scheduleDto.projectId = project.id;
        scheduleDto.projectCode = project.code;
        scheduleDto.projectName = project.name;
        scheduleDto.projectClientId = project.clients[0].id;
        scheduleDto.projectClientName =
          project.clients[project.clients.length - 1].name;
        scheduleDto.start = schedule.start.toISOString().split('T')[0];
        scheduleDto.end = schedule.end.toISOString().split('T')[0];

        return scheduleDto;
      }),
    );

    return result;
  }

  async getSchedule(id: number) {
    const schedule = await this.findScheduleById(id);
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

  async getScheduleWithUser(user: User, id: number) {
    const schedule = await this.findScheduleById(id);
    const project = await this.projectService.getProjectWithoutUser(
      schedule.project.id,
    );

    if (!schedule) {
      throw new NotFoundException('schedule_not_found');
    }

    // 2️⃣ 권한 체크: 본인 일정이거나 관리자만 접근 가능
    if (schedule.user.id !== user.id && !user.isAdmin) {
      throw new ForbiddenException('no_permission');
    }

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

  async getScheduleWithUsers(user: User, value: GetSchedulesDto) {
    const start = value.start
      ? dayjs(value.start).startOf('day')
      : dayjs().subtract(28, 'day').startOf('day');
    const end = value.end
      ? dayjs(value.end).endOf('day')
      : dayjs().add(28, 'day').endOf('day');

    let queryBuilder = this.scheduleRepository
      .createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.project', 'project')
      .leftJoinAndSelect('schedule.category', 'category')
      .leftJoinAndSelect('schedule.user', 'user')
      .where('schedule.start <= :end AND schedule.end >= :start', {
        start: start.toDate(),
        end: end.toDate(),
      })
      .andWhere('user.id = :userId', { userId: user.id });

    // value.projectId가 있을 때만 필터링 조건을 추가합니다.
    if (value.projectId) {
      queryBuilder = queryBuilder.andWhere('project.id = :projectId', {
        projectId: value.projectId,
      });
    }

    // 이제 queryBuilder를 사용하여 events, hasPrevious, hasNext 쿼리를 작성합니다.

    // 1. events 쿼리
    const events = await queryBuilder
      .orderBy('schedule.start', 'ASC')
      .addOrderBy('schedule.id', 'ASC')
      .getMany();

    // 2. hasPrevious 쿼리
    // queryBuilder를 복사하여 start 이전 조건만 추가
    const hasPrevious = await queryBuilder
      .clone() // 쿼리 빌더 복사
      .andWhere('schedule.end < :start', { start: start.toDate() })
      .getExists();

    // 3. hasNext 쿼리
    // queryBuilder를 복사하여 end 이후 조건만 추가
    const hasNext = await queryBuilder
      .clone() // 쿼리 빌더 복사
      .andWhere('schedule.start > :end', { end: end.toDate() })
      .getExists();

    const items = await Promise.all(
      events.map(async (schedule) => {
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
      }),
    );

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

  async createSchedule(user: User, value: CreateScheduleDto) {
    const project = await this.projectService.getProjectWithoutUser(
      value.projectId,
    );
    const category = await this.findCategoryById(value.categoryId);

    const summary = `[${category.name}][${project.clients[project.clients.length - 1].name}][${user.username}] ${value.summary} (${dayjs(value.start).format('MM/DD')} - ${dayjs(value.end).format('MM/DD')})`;
    const description =
      `[URL] ${value.url}` +
      (value.description ? `\n\n[설명]\n${value.description}` : '');

    const res = await this.calendarClient.events.insert({
      calendarId: this.scheduleCalendarId,
      requestBody: {
        summary: summary,
        description: description,
        location: project.clients[project.clients.length - 1].name,
        colorId: category.color,
        start: {
          date: dayjs(value.start).format('YYYY-MM-DD'),
        },
        end: {
          date: dayjs(value.end).add(1, 'day').format('YYYY-MM-DD'),
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

    const schedule = this.scheduleRepository.create({
      eventId,
      category,
      project,
      user,
      summary: value.summary,
      description: value.description,
      url: value.url,
      start: new Date(value.start),
      end: new Date(value.end),
    });

    const savedSchedule = await this.scheduleRepository.save(schedule);

    const scheduleDto = plainToInstance(
      ScheduleDto,
      {
        ...savedSchedule,
        projectId: project.id,
        projectCode: project.code,
        projectName: project.name,
        projectClientId: project.clients[0].id,
        projectClientName: project.clients[project.clients.length - 1].name,
      },
      {
        excludeExtraneousValues: true,
      },
    );

    await this.mailService.sendScheduleMail(project, scheduleDto);

    return scheduleDto;
  }

  async updateSchedule(user: User, id: number, value: UpdateScheduleDto) {
    // 1️⃣ 기존 스케줄 조회
    const schedule = await this.findScheduleById(id);

    if (!schedule) {
      throw new NotFoundException('schedule_not_found');
    }

    // 2️⃣ 권한 체크
    if (schedule.user.id !== user.id && !user.isAdmin) {
      throw new ForbiddenException('no_permission');
    }

    // 3️⃣ 새 프로젝트/카테고리 값 처리
    let projectId = value.projectId ?? schedule.project.id;
    let categoryId = value.categoryId ?? schedule.category.id;

    // ProjectDto로 가져오기 (clients 포함)
    const project = await this.projectService.getProjectWithoutUser(
      value.projectId,
    );
    const category = await this.findCategoryById(categoryId);

    const summary = `[${category.name}][${project.clients[project.clients.length - 1].name}][${user.username}] ${value.summary} (${dayjs(value.start).format('MM-DD')} - ${dayjs(value.end).format('MM-DD')})`;
    const description =
      `[URL] ${value.url}` +
      (value.description ? `\n\n[설명]\n${value.description}` : '');

    const eventBody: calendar_v3.Schema$Event = {
      summary: summary ?? schedule.summary,
      description: description ?? schedule.description,
      location: project.clients[project.clients.length - 1].name,
      colorId: category.color,
      start: {
        date:
          dayjs(value.start).format('YYYY-MM-DD') ??
          dayjs(schedule.start).format('YYYY-MM-DD'), // all-day 이벤트 가정
      },
      end: {
        date:
          dayjs(value.end).add(1, 'day').format('YYYY-MM-DD') ??
          dayjs(schedule.end).add(1, 'day').format('YYYY-MM-DD'),
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
        throw error;
      }
    }

    // 5️⃣ DB 업데이트
    const updatedSchedule = await this.scheduleRepository.save({
      id: schedule.id,
      eventId: newEventId,
      summary: value.summary ?? schedule.summary,
      description: value.description ?? schedule.description,
      url: value.url ?? schedule.url,
      start: value.start ? new Date(value.start) : schedule.start,
      end: value.end ? new Date(value.end) : schedule.end,
      project,
      category,
      user: schedule.user,
    });

    // 6️⃣ DTO 반환 (project 안에 clients 포함)
    const scheduleDto = plainToInstance(
      ScheduleDto,
      {
        ...updatedSchedule,
        projectId: project.id,
        projectCode: project.code,
        projectName: project.name,
        projectClientId: project.clients[0].id,
        projectClientName: project.clients[project.clients.length - 1].name,
        category,
      },
      { excludeExtraneousValues: true },
    );

    return scheduleDto;
  }

  async deleteSchedule(id: number) {
    const schedule = await this.scheduleRepository.findOne({
      where: { id },
      select: ['id', 'eventId'], // 필요한 필드만 선택
    });

    if (!schedule) {
      throw new NotFoundException('schedule_not_found');
    }

    // 2️⃣ Google Calendar 이벤트 삭제
    try {
      await this.calendarClient.events.delete({
        calendarId: this.scheduleCalendarId,
        eventId: schedule.eventId,
      });
    } catch (error: any) {
      // 404 에러(이벤트가 이미 캘린더에서 삭제된 경우)는 무시하고 계속 진행
      if (error.code !== 404) {
        // 다른 유형의 에러는 throw
        console.error(`Google Calendar Event Deletion Error: ${error.message}`);
        throw error;
      }
      // 404인 경우: 캘린더에는 없지만 DB에는 있는 상황이므로 DB 삭제는 계속 진행
    }

    // 3️⃣ DB에서 Schedule 논리적 삭제 (softDelete)
    await this.scheduleRepository.softDelete(id);
  }
}

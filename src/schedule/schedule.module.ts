import { Module } from '@nestjs/common';
import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';
import { UserModule } from '@/user/user.module';
import { Schedule } from '@/entity/schedule/schedule.entity';
import { ScheduleCategory } from '@/entity/schedule/schedule-category.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectModule } from '@/project/project.module';
import { MailModule } from '@/mail/mail.module';
import { ProjectClientModule } from '@/project/project-client.module';
import { ScheduleEditGuard } from '@/common/guards/schedule-edit.guard';
import { UserDepartmentClosure } from '@/entity/user/user-department-closure.entity';
import { Report } from '@/entity/report/report.entity';
import { ScheduleHoliday } from '@/entity/schedule/schedule-holiday.entity';
import { HolidayModule } from '@/holiday/holiday.module';
import { ScheduleCalendarSync } from '@/entity/schedule/schedule-calendar-sync.entity';
import { ScheduleCalendarClient } from './schedule-calendar.client';
import { ScheduleCalendarSyncProcessor } from './schedule-calendar-sync.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Schedule,
      ScheduleCategory,
      UserDepartmentClosure,
      Report,
      ScheduleHoliday,
      ScheduleCalendarSync,
    ]),
    ProjectModule,
    ProjectClientModule,
    UserModule,
    MailModule,
    HolidayModule,
  ],
  controllers: [ScheduleController],
  providers: [
    ScheduleService,
    ScheduleCalendarClient,
    ScheduleCalendarSyncProcessor,
    ScheduleEditGuard,
  ],
  exports: [ScheduleService],
})
export class ScheduleModule {}

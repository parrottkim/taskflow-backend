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

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Schedule,
      ScheduleCategory,
      UserDepartmentClosure,
    ]),
    ProjectModule,
    ProjectClientModule,
    UserModule,
    MailModule,
  ],
  controllers: [ScheduleController],
  providers: [ScheduleService, ScheduleEditGuard],
  exports: [ScheduleService],
})
export class ScheduleModule {}

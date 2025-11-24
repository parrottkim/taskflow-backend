import { Module } from '@nestjs/common';
import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';
import { UserModule } from 'src/user/user.module';
import { Schedule } from 'src/entity/schedule/schedule.entity';
import { ScheduleCategory } from 'src/entity/schedule/schedule-category.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectModule } from 'src/project/project.module';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Schedule, ScheduleCategory]),
    ProjectModule,
    UserModule,
    MailModule,
  ],
  providers: [ScheduleService],
  controllers: [ScheduleController],
  exports: [ScheduleService],
})
export class ScheduleModule {}

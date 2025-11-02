import { Module } from '@nestjs/common';
import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';
import { UserModule } from 'src/user/user.module';
import { Schedule } from 'src/entity/schedule/schedule.entity';
import { ScheduleCategory } from 'src/entity/schedule/schedule-category.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectClientModule } from 'src/project/project-client.module';
import { ProjectModule } from 'src/project/project.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Schedule, ScheduleCategory]),
    ProjectModule,
    ProjectClientModule,
    UserModule,
  ],
  providers: [ScheduleService],
  controllers: [ScheduleController],
  exports: [ScheduleService],
})
export class ScheduleModule {}

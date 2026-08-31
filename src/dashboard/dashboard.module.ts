import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from '@/entity/project/project.entity';
import { Schedule } from '@/entity/schedule/schedule.entity';
import { UserModule } from '@/user/user.module';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { Document } from '@/entity/document/document.entity';
import { Issue } from '@/entity/issue/issue.entity';
import { Report } from '@/entity/report/report.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, Document, Schedule, Issue, Report]),
    UserModule,
  ],
  providers: [DashboardService],
  controllers: [DashboardController],
})
export class DashboardModule {}

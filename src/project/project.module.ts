import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from '@/entity/project/project.entity';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { ProjectClientModule } from './project-client.module';
import { IssueModule } from '@/issue/issue.module';
import { Report } from '@/entity/report/report.entity';
import { Issue } from '@/entity/issue/issue.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, Issue, Report]),
    ProjectClientModule,
  ],
  providers: [ProjectService],
  controllers: [ProjectController],
  exports: [ProjectService],
})
export class ProjectModule {}

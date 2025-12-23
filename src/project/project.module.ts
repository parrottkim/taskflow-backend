import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from 'src/entity/project/project.entity';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { ProjectClientModule } from './project-client.module';
import { IssueModule } from 'src/issue/issue.module';
import { Report } from 'src/entity/report/report.entity';
import { Issue } from 'src/entity/issue/issue.entity';

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

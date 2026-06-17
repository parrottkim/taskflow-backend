import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from '@/entity/project/project.entity';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { ProjectClientModule } from './project-client.module';
import { Report } from '@/entity/report/report.entity';
import { Issue } from '@/entity/issue/issue.entity';
import { ProjectEditGuard } from '@/common/guards/project-edit.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, Issue, Report]),
    ProjectClientModule,
  ],
  controllers: [ProjectController],
  providers: [ProjectService, ProjectEditGuard],
  exports: [ProjectService, ProjectEditGuard],
})
export class ProjectModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from 'src/entity/project/project.entity';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { ProjectClientModule } from './project-client.module';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project]),
    UserModule,
    ProjectClientModule,
  ],
  providers: [ProjectService],
  controllers: [ProjectController],
  exports: [ProjectService],
})
export class ProjectModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectClientClosure } from '@/entity/project/project-client-closure.entity';
import { ProjectClient } from '@/entity/project/project-client.entity';
import { ProjectClientController } from './project-client.controller';
import { ProjectClientService } from './project-client.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectClient, ProjectClientClosure])],
  providers: [ProjectClientService],
  controllers: [ProjectClientController],
  exports: [ProjectClientService],
})
export class ProjectClientModule {}

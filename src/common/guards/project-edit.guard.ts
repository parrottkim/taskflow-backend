import { Project } from '@/entity/project/project.entity';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class ProjectEditGuard implements CanActivate {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const projectId = Number(request.params.id);

    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: ['createdBy'],
    });

    if (!project) {
      throw new NotFoundException('project_not_found');
    }

    if (project.createdBy.id !== user.id && !user.isAdmin) {
      throw new ForbiddenException('no_permission');
    }

    request.validateProjectId = project.id;

    return true;
  }
}

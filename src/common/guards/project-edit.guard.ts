import { Project } from '@/entity/project/project.entity';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { assertOwnerOrAdmin } from '../policies/resource-access.policy';

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
      throw new NotFoundException('not_found_project');
    }

    assertOwnerOrAdmin(user, project.createdBy.id);

    request.validateProjectId = project.id;

    return true;
  }
}

import { Issue } from '@/entity/issue/issue.entity';
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class IssueProcurementRequestGuard implements CanActivate {
  constructor(
    @InjectRepository(Issue)
    private readonly issueRepository: Repository<Issue>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const issueId = Number(request.params.id);

    const issue = await this.issueRepository.findOne({
      where: { id: issueId },
      relations: ['createdBy', 'project'], // 소유자 확인에 필요한 관계만 설정
      select: {
        id: true,
        createdBy: { id: true },
        project: { id: true },
      },
    });

    if (!issue) throw new NotFoundException('not_found_issue');

    if (user.department.id !== 1 && user.department.id !== 3) {
      throw new ForbiddenException('forbidden_access_denied');
    }

    request.validatedIssueId = issue.id;

    return true;
  }
}

import { Issue } from '@/entity/issue/issue.entity';
import { IssueService } from '@/issue/issue.service';
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
export class IssueEditGuard implements CanActivate {
  constructor(
    @InjectRepository(Issue)
    private readonly issueRepository: Repository<Issue>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const issueId = Number(request.params.id);

    // 권한 검증에 꼭 필요한 최소 필드만 조회 (heavy join 배제)
    const issue = await this.issueRepository.findOne({
      where: { id: issueId },
      relations: ['user', 'project'], // 소유자 확인에 필요한 관계만 설정
      select: {
        id: true,
        user: { id: true },
        project: { id: true },
      },
    });

    if (!issue) throw new NotFoundException('issue_not_found');

    // 권한 체크 로직 (예: 작성자 본인이거나, 프로젝트 관리자이거나, 어드민인 경우)
    if (issue.user.id !== user.id && !user.isAdmin) {
      throw new ForbiddenException('no_permission');
    }

    // 가벼운 식별 데이터만 컨트롤러/서비스로 토스
    request.validatedIssueId = issue.id;

    return true;
  }
}

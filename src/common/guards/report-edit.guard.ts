import { Report } from '@/entity/report/report.entity';
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
export class ReportEditGuard implements CanActivate {
  constructor(
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const reportId = Number(request.params.id);

    const report = await this.reportRepository.findOne({
      where: { id: reportId },
      relations: ['createdBy'],
    });

    if (!report) throw new NotFoundException('report_not_found');

    assertOwnerOrAdmin(user, report.createdBy.id);

    request.validatedReportId = report.id;

    return true;
  }
}

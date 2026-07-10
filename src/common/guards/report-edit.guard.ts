import { Report } from '@/entity/report/report.entity';
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

    if (report.createdBy.id !== user.id && !user.isAdmin) {
      throw new ForbiddenException('no_permission');
    }

    request.validatedReportId = report.id;

    return true;
  }
}

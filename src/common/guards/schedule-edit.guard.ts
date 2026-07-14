import { Schedule } from '@/entity/schedule/schedule.entity';
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
export class ScheduleEditGuard implements CanActivate {
  constructor(
    @InjectRepository(Schedule)
    private readonly scheduleRepository: Repository<Schedule>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const scheduleId = Number(request.params.id);

    const schedule = await this.scheduleRepository.findOne({
      where: { id: scheduleId },
      relations: ['user'],
    });

    if (!schedule) {
      throw new NotFoundException('schedule_not_found');
    }

    assertOwnerOrAdmin(user, schedule.user.id);

    request.validateScheduleId = schedule.id;

    return true;
  }
}

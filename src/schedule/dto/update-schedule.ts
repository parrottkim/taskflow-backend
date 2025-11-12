import { PartialType } from '@nestjs/swagger';
import { CreateScheduleDto } from './create-schedule';

export class UpdateScheduleDto extends PartialType(CreateScheduleDto) {}

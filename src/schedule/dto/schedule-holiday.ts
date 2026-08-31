import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class ScheduleHolidayDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty({ enum: ['WEEKEND', 'PUBLIC_HOLIDAY'] })
  @Expose()
  type: 'WEEKEND' | 'PUBLIC_HOLIDAY';

  @ApiProperty({ example: '2026-05-25T00:00:00.000Z' })
  @Type(() => Date)
  @Expose()
  date: Date;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  name?: string;

  @ApiProperty()
  @Expose()
  isTravelOnly: boolean;

  @ApiProperty({ required: false, nullable: true })
  @Type(() => Date)
  @Expose()
  compensatoryLeaveDate?: Date;
}

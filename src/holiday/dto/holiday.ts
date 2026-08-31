import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class HolidayDto {
  @ApiProperty({ example: '2026-05-05T00:00:00.000Z' })
  @Type(() => Date)
  date: Date;

  @ApiProperty({ example: '어린이날' })
  name: string;
}

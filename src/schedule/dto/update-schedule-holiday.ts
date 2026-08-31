import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsNotEmpty, IsOptional } from 'class-validator';

export class UpdateScheduleHolidayDto {
  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  date: Date;

  @ApiProperty({
    description: '해당 날짜에 업무 없이 이동만 했는지 여부',
    example: false,
  })
  @IsBoolean()
  isTravelOnly: boolean;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  compensatoryLeaveDate?: Date;
}

import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { UpdateScheduleHolidayDto } from './update-schedule-holiday';

export class CreateScheduleDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  summary: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  projectId: number;

  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  categoryId: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  start: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  end: string;

  @ApiProperty({
    type: [UpdateScheduleHolidayDto],
    required: false,
    description: '국내출장 기간 중 주말/공휴일 정보',
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateScheduleHolidayDto)
  holidays?: UpdateScheduleHolidayDto[];
}

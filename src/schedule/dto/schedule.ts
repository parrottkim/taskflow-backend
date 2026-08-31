import { ApiProperty } from '@nestjs/swagger';
import { Expose, plainToInstance, Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { UserDto } from '@/user/dto/user';
import { ScheduleCategoryDto } from './schedule-category';
import { ScheduleHolidayDto } from './schedule-holiday';

export class ScheduleDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  eventId: string;

  @ApiProperty({
    required: false,
    nullable: true,
    description: '스케줄에 연결된 활성 보고서 ID',
  })
  @Transform(({ value, obj }) => value ?? obj.reports?.[0]?.id ?? null)
  @Expose()
  reportId: number | null;

  @ApiProperty()
  @Expose()
  projectId: number;

  @ApiProperty()
  @IsString()
  @Expose()
  projectCode: string;

  @ApiProperty()
  @Expose()
  projectName: string;

  @ApiProperty()
  @Expose()
  projectClientId: number;

  @ApiProperty()
  @Expose()
  projectClientName: string;

  @ApiProperty()
  @Type(() => ScheduleCategoryDto)
  @Expose()
  category: ScheduleCategoryDto;

  @ApiProperty()
  @Type(() => UserDto)
  @Expose()
  user: UserDto;

  @ApiProperty({ type: [ScheduleHolidayDto] })
  @ValidateNested({ each: true })
  @Type(() => ScheduleHolidayDto)
  @Expose()
  holidays: ScheduleHolidayDto[];

  @ApiProperty()
  @Expose()
  summary: string;

  @ApiProperty()
  @Expose()
  url: string;

  @ApiProperty()
  @Expose()
  description?: string;

  @ApiProperty()
  @Expose()
  start: string;

  @ApiProperty()
  @Expose()
  end: string;

  @ApiProperty()
  @Type(() => Date)
  @Expose()
  createdAt: Date;

  @ApiProperty()
  @Type(() => Date)
  @Expose()
  updatedAt: Date;

  @ApiProperty({ required: false, nullable: true })
  @Type(() => Date)
  @Expose()
  deletedAt: Date | null;
}

export class ScheduleGroupDto {
  @ApiProperty()
  @Expose()
  date: string;

  @ApiProperty({ type: [ScheduleDto] })
  @ValidateNested({ each: true })
  @Type(() => ScheduleDto)
  @Expose()
  items: ScheduleDto[];
}

export class ScheduleListDto {
  @ApiProperty({ type: [ScheduleGroupDto] })
  @ValidateNested({ each: true })
  @Type(() => ScheduleGroupDto)
  @Expose()
  items: ScheduleGroupDto[];

  @ApiProperty()
  @Expose()
  hasNext: boolean;

  @ApiProperty()
  @Expose()
  hasPrevious: boolean;
}

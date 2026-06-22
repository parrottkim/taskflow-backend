import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsInt,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from 'class-validator';
import { UserDto } from '@/user/dto/user';
import { ScheduleDto } from '@/schedule/dto/schedule';
import { TripReportDto } from './trip/trip-report';
import { ReportAttachmentDto } from './report-attachment';

export class ReportDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty({ type: ScheduleDto })
  @Type(() => ScheduleDto)
  @Expose()
  schedule: ScheduleDto | null;

  @ApiProperty({ type: UserDto })
  @Type(() => UserDto)
  @Expose()
  user: UserDto;

  @ApiProperty({ type: TripReportDto, required: false, nullable: true })
  @ValidateNested()
  @Type(() => TripReportDto)
  @Expose()
  trip?: TripReportDto;

  @ApiProperty()
  @Expose()
  content: string;

  @ApiProperty({ type: [ReportAttachmentDto] })
  @ValidateNested({ each: true })
  @Type(() => ReportAttachmentDto)
  @Expose()
  attachments: ReportAttachmentDto[];

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

export class ReportListDto {
  @ApiProperty({ type: [ReportDto] })
  @ValidateNested({ each: true })
  @Type(() => ReportDto)
  @Expose()
  items: ReportDto[];

  @ApiProperty()
  @Expose()
  page: number;

  @ApiProperty()
  @Expose()
  total: number;
}

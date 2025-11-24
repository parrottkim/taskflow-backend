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
import { UserDto } from 'src/user/dto/user';
import { ScheduleDto } from 'src/schedule/dto/schedule';
import { TripReportDto } from './trip/trip-report';
import { ReportAttachmentDto } from './report-attachment';

export class ReportDto {
  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  @Expose()
  id: number;

  @ApiProperty({ type: ScheduleDto })
  @Type(() => ScheduleDto)
  @Expose()
  schedule: ScheduleDto;

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
  @IsString()
  @IsNotEmpty()
  @Expose()
  content: string;

  @ApiProperty({ type: [ReportAttachmentDto] })
  @ValidateNested({ each: true })
  @Type(() => ReportAttachmentDto)
  @Expose()
  attachments: ReportAttachmentDto[];

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  @Expose()
  createdAt: Date;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  @Expose()
  updatedAt: Date;

  @ApiProperty({ required: false, nullable: true })
  @Type(() => Date)
  @IsDate()
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
  @IsInt()
  @IsNotEmpty()
  @Expose()
  page: number;

  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  @Expose()
  total: number;
}

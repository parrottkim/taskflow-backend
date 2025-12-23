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
import { UserDto } from 'src/user/dto/user';
import { ScheduleCategoryDto } from './schedule-category';

export class ScheduleDto {
  @ApiProperty()
  @IsInt()
  @Expose()
  id: number;

  @ApiProperty()
  @IsString()
  @Expose()
  eventId: string;

  @ApiProperty()
  @IsInt()
  @Expose()
  projectId: number;

  @ApiProperty()
  @IsString()
  @Expose()
  projectCode: string;

  @ApiProperty()
  @IsString()
  @Expose()
  projectName: string;

  @ApiProperty()
  @IsInt()
  @Expose()
  projectClientId: number;

  @ApiProperty()
  @IsString()
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

  @ApiProperty()
  @IsString()
  @Expose()
  summary: string;

  @ApiProperty()
  @IsString()
  @Expose()
  url: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  @Expose()
  description?: string;

  @ApiProperty()
  @IsDateString()
  @Expose()
  start: string;

  @ApiProperty()
  @IsDateString()
  @Expose()
  end: string;

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

export class ScheduleGroupDto {
  @ApiProperty()
  @IsDateString()
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
  @IsBoolean()
  @IsNotEmpty()
  @Expose()
  hasNext: boolean;

  @ApiProperty()
  @IsBoolean()
  @IsNotEmpty()
  @Expose()
  hasPrevious: boolean;
}

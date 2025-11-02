import { ApiProperty } from '@nestjs/swagger';
import { Expose, plainToInstance, Transform, Type } from 'class-transformer';
import {
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
  @Transform(({ obj }) => {
    switch (obj.category.id) {
      case 1:
        return plainToInstance(
          ScheduleCategoryDto,
          {
            type: 'domestic',
            id: obj.category.id,
            name: obj.category.name,
            color: obj.category.color,
          },
          {
            excludeExtraneousValues: true,
          },
        );
      case 2:
        return plainToInstance(
          ScheduleCategoryDto,
          {
            type: 'overseas',
            id: obj.category.id,
            name: obj.category.name,
            color: obj.category.color,
          },
          {
            excludeExtraneousValues: true,
          },
        );
    }
  })
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
}

export class ScheduleListDto {
  @ApiProperty({ type: [ScheduleDto] })
  @ValidateNested({ each: true })
  @Type(() => ScheduleDto)
  @Expose()
  items: ScheduleDto[];

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

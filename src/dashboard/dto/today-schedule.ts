import { ApiProperty } from '@nestjs/swagger';
import { Expose, plainToInstance, Transform, Type } from 'class-transformer';
import { IsString, IsDateString } from 'class-validator';
import { ScheduleCategoryDto } from 'src/schedule/dto/schedule-category';
import { UserDto } from 'src/user/dto/user';

export class TodayScheduleDto {
  @ApiProperty()
  @IsString()
  @Expose()
  summary: string;

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
      case 3:
        return plainToInstance(
          ScheduleCategoryDto,
          {
            type: 'center',
            id: obj.category.id,
            name: obj.category.name,
            color: obj.category.color,
          },
          {
            excludeExtraneousValues: true,
          },
        );
      case 4:
        return plainToInstance(
          ScheduleCategoryDto,
          {
            type: 'remote',
            id: obj.category.id,
            name: obj.category.name,
            color: obj.category.color,
          },
          {
            excludeExtraneousValues: true,
          },
        );
      case 5:
        return plainToInstance(
          ScheduleCategoryDto,
          {
            type: 'meeting',
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
  @IsDateString()
  @Expose()
  start: string;

  @ApiProperty()
  @IsDateString()
  @Expose()
  end: string;

  @ApiProperty()
  @IsString()
  @Expose()
  projectClientName: string;

  @ApiProperty()
  @Type(() => UserDto)
  @Expose()
  user: UserDto;
}

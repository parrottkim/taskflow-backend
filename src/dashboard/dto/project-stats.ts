import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsNumber, ValidateNested } from 'class-validator';
import { UserDto } from 'src/user/dto/user';

export class ProjectStatsDto {
  @ApiProperty()
  @IsNumber()
  valid: number; // 유효한 프로젝트 개수

  @ApiProperty()
  @IsNumber()
  total: number; // 총 프로젝트 개수

  @ApiProperty({ type: UserDto })
  @Type(() => UserDto)
  user: UserDto;
}

export class ProjectStatsListDto {
  @ApiProperty({ type: [ProjectStatsDto] })
  @ValidateNested({ each: true })
  @Type(() => ProjectStatsDto)
  @Expose()
  items: ProjectStatsDto[];

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

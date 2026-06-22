import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { UserDto } from '@/user/dto/user';
import { ProjectClientDto } from './project-client';
import { IssueCategoryDto } from '../../issue/dto/issue-category';

export class ProjectDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  code: string;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiProperty()
  @Expose()
  views: number;

  @ApiProperty({ type: UserDto })
  @Type(() => UserDto)
  @Expose()
  user: UserDto;

  @ApiProperty({ type: UserDto })
  @Type(() => UserDto)
  @Expose()
  manager?: UserDto;

  @ApiProperty({ type: IssueCategoryDto })
  @Type(() => IssueCategoryDto)
  @Expose()
  latestCategory: IssueCategoryDto;

  @ApiProperty({ type: [ProjectClientDto] })
  @ValidateNested({ each: true })
  @Type(() => ProjectClientDto)
  @Expose()
  clients: ProjectClientDto[]; // 상위 객체들을 포함하는 필드 추가

  @ApiProperty()
  @Expose()
  isPreexecuted: boolean;

  @ApiProperty()
  @Expose()
  isContracted: boolean;

  @ApiProperty()
  @Expose()
  isClosed: boolean;

  @ApiProperty()
  @Expose()
  closureMessage: string;

  @ApiProperty()
  @Expose()
  isBookmarked: boolean;

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

export class ProjectListDto {
  @ApiProperty({ type: [ProjectDto] })
  @ValidateNested({ each: true })
  @Type(() => ProjectDto)
  @Expose()
  items: ProjectDto[];

  @ApiProperty()
  @Expose()
  page: number;

  @ApiProperty()
  @Expose()
  total: number;
}

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
import { UserDto } from 'src/user/dto/user';
import { ProjectClientDto } from './project-client';
import { IssueCategoryDto } from '../../issue/dto/issue-category';

export class ProjectDto {
  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  @Expose()
  id: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Expose()
  code: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Expose()
  name: string;

  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
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
  @IsBoolean()
  @IsNotEmpty()
  @Expose()
  isPreexecuted: boolean;

  @ApiProperty()
  @IsBoolean()
  @IsNotEmpty()
  @Expose()
  isContracted: boolean;

  @ApiProperty()
  @IsBoolean()
  @IsNotEmpty()
  @Expose()
  isClosed: boolean;

  @ApiProperty()
  @IsString()
  @IsOptional()
  @Expose()
  closureMessage: string;

  @ApiProperty()
  @IsBoolean()
  @IsNotEmpty()
  @Expose()
  isBookmarked: boolean;

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

export class ProjectListDto {
  @ApiProperty({ type: [ProjectDto] })
  @ValidateNested({ each: true })
  @Type(() => ProjectDto)
  @Expose()
  items: ProjectDto[];

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

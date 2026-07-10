import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsDate,
  IsString,
  ValidateNested,
} from 'class-validator';
import { UserDto } from '@/user/dto/user';
import { ProjectClientDto } from '@/project/dto/project-client';
import { IssueCategoryDto } from './issue-category';

export class LatestIssueDto {
  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  @Expose()
  id: number;

  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  @Expose()
  projectId: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Expose()
  projectCode: String;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Expose()
  projectName: String;

  @ApiProperty({ type: IssueCategoryDto })
  @Type(() => IssueCategoryDto)
  @Expose()
  category: IssueCategoryDto;

  @ApiProperty({ type: [ProjectClientDto] })
  @ValidateNested({ each: true })
  @Type(() => ProjectClientDto)
  @Expose()
  clients: ProjectClientDto[];

  @ApiProperty({ type: UserDto })
  @Type(() => UserDto)
  @Expose()
  createdBy: UserDto;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  @Expose()
  createdAt: Date;
}

export class LatestIssueListDto {
  @ApiProperty({ type: [LatestIssueDto] })
  @ValidateNested({ each: true })
  @Type(() => LatestIssueDto)
  @Expose()
  items: LatestIssueDto[];

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

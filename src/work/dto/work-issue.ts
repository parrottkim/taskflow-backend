import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IssueCategoryDto } from '@/issue/dto/issue-category';
import { ProjectClientDto } from '@/project/dto/project-client';
import { UserDto } from '@/user/dto/user';

export class WorkIssueListItemDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  projectId: number;

  @ApiProperty()
  @Expose()
  projectCode: string;

  @ApiProperty()
  @Expose()
  projectName: string;

  @ApiProperty({ type: IssueCategoryDto })
  @Type(() => IssueCategoryDto)
  @Expose()
  category: IssueCategoryDto;

  @ApiProperty({ type: [ProjectClientDto] })
  @Type(() => ProjectClientDto)
  @Expose()
  clients: ProjectClientDto[];

  @ApiProperty({ type: UserDto })
  @Type(() => UserDto)
  @Expose()
  createdBy: UserDto;

  @ApiProperty()
  @Type(() => Date)
  @Expose()
  createdAt: Date;

  @ApiProperty()
  @Type(() => Date)
  @Expose()
  updatedAt: Date;
}

export class WorkIssueListDto {
  @ApiProperty({ type: [WorkIssueListItemDto] })
  @Type(() => WorkIssueListItemDto)
  @Expose()
  items: WorkIssueListItemDto[];

  @ApiProperty()
  @Expose()
  page: number;

  @ApiProperty()
  @Expose()
  total: number;
}

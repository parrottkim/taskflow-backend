import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class GetWorkItemsDto {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';

  @ApiPropertyOptional({
    description: '검색어. 목록별 검색 대상 필드는 각 API 설명을 따릅니다.',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: '고객사 ID 목록. 쉼표로 구분하며 하위 고객사를 포함합니다.',
    example: '1,2',
  })
  @IsOptional()
  @IsString()
  clients?: string;
}

export class GetWorkProjectsDto extends GetWorkItemsDto {
  @ApiPropertyOptional({
    enum: ['all', 'preexecuted', 'active', 'closed'],
    description: '생략하거나 all을 지정하면 전체 프로젝트를 조회합니다.',
  })
  @IsOptional()
  @IsIn(['all', 'preexecuted', 'active', 'closed'])
  status?: 'all' | 'preexecuted' | 'active' | 'closed';

  @ApiPropertyOptional({
    enum: ['updated', 'created', 'code', 'name'],
    default: 'created',
  })
  @IsOptional()
  @IsIn(['updated', 'created', 'code', 'name'])
  sort?: 'updated' | 'created' | 'code' | 'name';

  @ApiPropertyOptional({
    description: '프로젝트의 최근 이슈 카테고리 ID 목록',
    example: '1,2',
  })
  @IsOptional()
  @IsString()
  categories?: string;
}

export class GetWorkIssuesDto extends GetWorkItemsDto {
  @ApiPropertyOptional({
    enum: ['updated', 'created', 'category'],
    default: 'created',
  })
  @IsOptional()
  @IsIn(['updated', 'created', 'category'])
  sort?: 'updated' | 'created' | 'category';

  @ApiPropertyOptional({
    description: '이슈 카테고리 ID 목록',
    example: '1,2',
  })
  @IsOptional()
  @IsString()
  categories?: string;
}

export class GetWorkReportsDto extends GetWorkItemsDto {
  @ApiPropertyOptional({
    enum: ['updated', 'created', 'category', 'schedule'],
    default: 'created',
  })
  @IsOptional()
  @IsIn(['updated', 'created', 'category', 'schedule'])
  sort?: 'updated' | 'created' | 'category' | 'schedule';

  @ApiPropertyOptional({
    description: '보고서에 연결된 일정 카테고리 ID 목록',
    example: '1,2',
  })
  @IsOptional()
  @IsString()
  categories?: string;

  @ApiPropertyOptional({
    description: '일정 조회 시작일',
    example: '2026-07-01',
  })
  @IsOptional()
  @IsDateString()
  start?: string;

  @ApiPropertyOptional({
    description: '일정 조회 종료일',
    example: '2026-07-31',
  })
  @IsOptional()
  @IsDateString()
  end?: string;
}

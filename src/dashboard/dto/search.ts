import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export enum DashboardSearchItemType {
  Project = 'project',
  Document = 'document',
  Schedule = 'schedule',
  Issue = 'issue',
  Report = 'report',
}

export class DashboardSearchItemDto {
  @ApiProperty({ enum: DashboardSearchItemType })
  @Expose()
  type: DashboardSearchItemType;

  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  title: string;

  @ApiPropertyOptional()
  @Expose()
  subtitle?: string;

  @ApiPropertyOptional()
  @Expose()
  projectId?: number;

  @ApiPropertyOptional()
  @Expose()
  projectCode?: string;

  @ApiPropertyOptional()
  @Expose()
  projectName?: string;

  @ApiPropertyOptional()
  @Expose()
  folderId?: number;

  @ApiPropertyOptional()
  @Expose()
  folderName?: string;

  @ApiPropertyOptional()
  @Expose()
  categoryId?: number;

  @ApiPropertyOptional()
  @Expose()
  categoryName?: string;

  @ApiPropertyOptional()
  @Expose()
  categoryType?: string;

  @ApiPropertyOptional({ type: Date })
  @Type(() => Date)
  @Expose()
  start?: Date;

  @ApiPropertyOptional({ type: Date })
  @Type(() => Date)
  @Expose()
  end?: Date;

  @ApiProperty({ type: Date })
  @Type(() => Date)
  @Expose()
  updatedAt: Date;
}

export class DashboardSearchGroupDto {
  @ApiProperty({ type: [DashboardSearchItemDto] })
  @Type(() => DashboardSearchItemDto)
  @Expose()
  items: DashboardSearchItemDto[];

  @ApiProperty()
  @Expose()
  total: number;
}

export class DashboardSearchResultDto {
  @ApiProperty({ type: DashboardSearchGroupDto })
  @Type(() => DashboardSearchGroupDto)
  @Expose()
  projects: DashboardSearchGroupDto;

  @ApiProperty({ type: DashboardSearchGroupDto })
  @Type(() => DashboardSearchGroupDto)
  @Expose()
  documents: DashboardSearchGroupDto;

  @ApiProperty({ type: DashboardSearchGroupDto })
  @Type(() => DashboardSearchGroupDto)
  @Expose()
  schedules: DashboardSearchGroupDto;

  @ApiProperty({ type: DashboardSearchGroupDto })
  @Type(() => DashboardSearchGroupDto)
  @Expose()
  issues: DashboardSearchGroupDto;

  @ApiProperty({ type: DashboardSearchGroupDto })
  @Type(() => DashboardSearchGroupDto)
  @Expose()
  reports: DashboardSearchGroupDto;
}

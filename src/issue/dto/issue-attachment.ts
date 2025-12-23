import { Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IssueCategoryDto } from './issue-category';

export class IssueAttachmentDto {
  @Expose()
  @ApiProperty()
  id: number;

  @Expose()
  @ApiProperty()
  filename: string;

  @Expose()
  @ApiProperty()
  path: string;

  @Expose()
  @ApiProperty()
  size: number;

  @Expose()
  @ApiProperty()
  mimeType: string;

  @Expose()
  @ApiProperty()
  createdAt: Date;
}

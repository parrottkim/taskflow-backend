import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { ProjectListItemDto } from '@/project/dto/project';

export class WorkProjectListItemDto extends ProjectListItemDto {}

export class WorkProjectListDto {
  @ApiProperty({ type: [WorkProjectListItemDto] })
  @Type(() => WorkProjectListItemDto)
  @Expose()
  items: WorkProjectListItemDto[];

  @ApiProperty()
  @Expose()
  page: number;

  @ApiProperty()
  @Expose()
  total: number;
}

import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { ProjectClientDto } from '@/project/dto/project-client';
import { UserDto } from '@/user/dto/user';
import { ScheduleDto } from '@/schedule/dto/schedule';

export class WorkReportListItemDto {
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

  @ApiProperty({ type: [ProjectClientDto] })
  @Type(() => ProjectClientDto)
  @Expose()
  clients: ProjectClientDto[];

  @ApiProperty({
    type: ScheduleDto,
    required: false,
    nullable: true,
  })
  @Type(() => ScheduleDto)
  @Expose()
  schedule?: ScheduleDto | null;

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

export class WorkReportListDto {
  @ApiProperty({ type: [WorkReportListItemDto] })
  @Type(() => WorkReportListItemDto)
  @Expose()
  items: WorkReportListItemDto[];

  @ApiProperty()
  @Expose()
  page: number;

  @ApiProperty()
  @Expose()
  total: number;
}

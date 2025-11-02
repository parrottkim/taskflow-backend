import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, Min } from 'class-validator';

export class GetIssuesDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(10)
  @IsOptional()
  limit?: number = 10;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  @Expose({ name: 'project_id' })
  projectId: number;
}

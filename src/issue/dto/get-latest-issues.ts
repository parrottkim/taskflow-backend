import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min, IsOptional } from 'class-validator';

export class GetLatestIssuesDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(20)
  @IsOptional()
  limit?: number = 20;
}

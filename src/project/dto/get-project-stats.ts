import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, Min, IsOptional, IsString } from 'class-validator';

export class GetProjectStatsDto {
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

  @ApiProperty()
  @IsOptional()
  @IsString()
  start?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  end?: string;
}

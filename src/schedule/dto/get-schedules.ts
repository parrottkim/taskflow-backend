import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsInt, Min, IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class GetSchedulesDto {
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
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  @Expose({ name: 'project_id' })
  projectId: number;

  @ApiProperty()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  start?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  end?: string;
}

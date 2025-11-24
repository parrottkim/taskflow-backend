import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class GetSchedulesDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Expose({ name: 'project_id' })
  projectId?: number;

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

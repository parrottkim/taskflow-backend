import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class GetProjectsDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 40;

  @ApiProperty()
  @IsOptional()
  @IsIn(['all', 'preexecuted', 'active', 'closed'])
  view?: 'all' | 'preexecuted' | 'active' | 'closed';

  @ApiProperty()
  @IsOptional()
  @IsIn(['updated', 'created', 'code', 'name'])
  sort?: 'updated' | 'created' | 'code' | 'name';

  @ApiProperty()
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';

  @ApiProperty()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  @IsOptional()
  bookmark?: boolean;

  @ApiProperty()
  @IsOptional()
  clients?: string;

  @ApiProperty()
  @IsOptional()
  categories?: string;
}

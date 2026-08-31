import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, Min, IsOptional, IsString } from 'class-validator';

export class GetUsersDto {
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
  @IsOptional()
  @IsInt()
  @Expose({ name: 'department_id' })
  departmentId?: number;

  @ApiProperty()
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Expose({ name: 'rank_id' })
  rankId?: number;

  @ApiProperty()
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Expose({ name: 'position_id' })
  positionId?: number;

  @ApiProperty()
  @IsOptional()
  @IsString()
  search?: string;
}

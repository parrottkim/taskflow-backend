import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min, IsOptional, IsString } from 'class-validator';

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
  departmentId?: number;

  @ApiProperty()
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  positionId?: number;

  @ApiProperty()
  @IsOptional()
  @IsString()
  search?: string;
}

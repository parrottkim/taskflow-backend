import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class DepartmentDto {
  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  @Expose()
  id: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Expose()
  name: string;

  @ApiProperty()
  @IsInt()
  @IsOptional()
  @Expose()
  root?: number;
}

export class DepartmentGroupDto {
  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  @Expose()
  depth: number;

  @ApiProperty()
  @IsInt()
  @IsOptional()
  @Expose()
  parentId?: number;

  @ApiProperty({ type: [DepartmentDto] })
  @ValidateNested({ each: true })
  @Type(() => DepartmentDto)
  @Expose()
  items: DepartmentDto[];
}

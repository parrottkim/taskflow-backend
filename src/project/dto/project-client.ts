import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class ProjectClientDto {
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
}

export class ProjectClientGroupDto {
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

  @ApiProperty({ type: [ProjectClientDto] })
  @ValidateNested({ each: true })
  @Type(() => ProjectClientDto)
  @Expose()
  items: ProjectClientDto[];
}

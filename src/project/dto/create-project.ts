import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  IsBoolean,
  IsOptional,
} from 'class-validator';

export class CreateProjectDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  managerId?: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  clientId: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  projectCode: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  projectName: string;

  @ApiProperty()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  @IsNotEmpty()
  isPreexecuted: boolean = false;
}

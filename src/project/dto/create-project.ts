import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
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
  @IsBoolean()
  @IsOptional()
  isPreexecuted?: boolean;
}

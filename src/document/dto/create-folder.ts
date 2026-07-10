import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class CreateFolderDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ name: 'parent_id' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  @Expose({ name: 'parent_id' })
  parentId?: number;

  @ApiProperty()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  fixed: boolean = false;
}

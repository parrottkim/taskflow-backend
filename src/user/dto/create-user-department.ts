import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
  IsNumber,
} from 'class-validator';

export class CreateUserDepartmentTranslationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  locale: string;
}

export class CreateUserDepartmentDto {
  @ApiProperty()
  @IsArray()
  @IsNotEmpty()
  translations: CreateUserDepartmentTranslationDto[];

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  parentId?: number;
}

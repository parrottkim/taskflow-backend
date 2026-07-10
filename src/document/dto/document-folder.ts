import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  ValidateNested,
} from 'class-validator';

export class DocumentFolderDto {
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
  parentId?: number;

  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  @Expose()
  sort: number;

  @ApiProperty()
  @IsBoolean()
  @Expose()
  fixed: boolean;

  @ApiProperty({ type: () => [DocumentFolderDto] })
  @ValidateNested({ each: true })
  @Type(() => DocumentFolderDto)
  @Expose()
  children: DocumentFolderDto[];
}

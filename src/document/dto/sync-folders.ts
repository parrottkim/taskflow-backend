import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class SyncDocumentFolderDto {
  @ApiProperty()
  @IsOptional()
  @IsInt()
  id?: number | null;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ required: false, nullable: true })
  @IsInt()
  @IsOptional()
  parentId?: number | null;

  @ApiProperty()
  @IsInt()
  sort: number;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  fixed: boolean = false;

  @ApiProperty({ type: () => [SyncDocumentFolderDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncDocumentFolderDto)
  children: SyncDocumentFolderDto[] = [];
}

export class SyncDocumentFoldersDto {
  @ApiProperty({ type: () => [SyncDocumentFolderDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncDocumentFolderDto)
  items: SyncDocumentFolderDto[];
}

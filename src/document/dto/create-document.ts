import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsBoolean,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { DocumentAttachmentDto } from './document-attachment';

export class CreateDocumentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  folderId: number;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  fixed: boolean = false;

  @ApiProperty({ type: [DocumentAttachmentDto], description: '첨부 파일 목록' })
  @ValidateNested({ each: true })
  @Type(() => DocumentAttachmentDto)
  attachments: DocumentAttachmentDto[];
}

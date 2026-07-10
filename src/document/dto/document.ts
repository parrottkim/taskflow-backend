import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import { DocumentAttachmentDto } from './document-attachment';
import { ValidateNested } from 'class-validator';
import { UserDto } from '@/user/dto/user';

export class DocumentDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  title: string;

  @ApiProperty()
  @Expose()
  content: string;

  @ApiProperty()
  @Transform(({ obj }) => obj.folder?.id)
  @Expose()
  folderId: number;

  @ApiProperty()
  @Expose()
  fixed: boolean;

  @ApiProperty({ type: UserDto })
  @Type(() => UserDto)
  @Expose()
  createdBy: UserDto;

  @ApiProperty({ type: UserDto, required: false })
  @Type(() => UserDto)
  @Expose()
  updatedBy?: UserDto;

  @ApiProperty()
  @Type(() => DocumentAttachmentDto)
  @Expose()
  attachments?: DocumentAttachmentDto[];

  @ApiProperty()
  @Type(() => Date)
  @Expose()
  createdAt: Date;

  @ApiProperty()
  @Type(() => Date)
  @Expose()
  updatedAt: Date;

  @ApiProperty({ required: false, nullable: true })
  @Type(() => Date)
  @Expose()
  deletedAt: Date | null;
}

export class DocumentListDto {
  @ApiProperty({ type: [DocumentDto] })
  @ValidateNested({ each: true })
  @Type(() => DocumentDto)
  @Expose()
  items: DocumentDto[];

  @ApiProperty()
  @Expose()
  page: number;

  @ApiProperty()
  @Expose()
  total: number;
}

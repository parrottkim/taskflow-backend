import { ApiProperty } from '@nestjs/swagger';
import { Type, Expose } from 'class-transformer';
import {
  IsInt,
  Min,
  IsOptional,
  IsNotEmpty,
  IsString,
  IsIn,
} from 'class-validator';

export class GetDocumentsDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 20;

  @ApiProperty({ name: 'folder_id' })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  @Expose({ name: 'folder_id' })
  folderId: number;

  @ApiProperty()
  @IsOptional()
  @IsIn(['recent', 'title'])
  sort: 'recent' | 'title';

  @ApiProperty()
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';

  @ApiProperty()
  @IsOptional()
  @IsString()
  search?: string;
}

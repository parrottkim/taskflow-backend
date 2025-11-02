import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsString, IsNotEmpty } from 'class-validator';

export class UploadInlineImageDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Expose()
  path: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Expose()
  url: string;
}

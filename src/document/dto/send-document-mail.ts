import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional } from 'class-validator';

export class SendDocumentMailDto {
  @ApiProperty({ required: false, type: [Number] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  userIds?: number[];
}

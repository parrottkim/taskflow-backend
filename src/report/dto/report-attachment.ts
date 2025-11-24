import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, IsDate } from 'class-validator';

export class ReportAttachmentDto {
  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  @Expose()
  id: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Expose()
  filename: string;

  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  @Expose()
  size: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Expose()
  path: string;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  @Expose()
  createdAt: Date;
}

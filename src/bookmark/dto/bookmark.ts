import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDate, IsInt, IsNotEmpty } from 'class-validator';

export class BookmarkDto {
  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  userId: number;

  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  projectId: number;

  @ApiProperty({ example: '2025-06-26T12:34:56.000Z' })
  @IsDate()
  @IsNotEmpty()
  createdAt: Date;
}

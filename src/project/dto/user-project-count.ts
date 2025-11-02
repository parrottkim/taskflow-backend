import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty } from 'class-validator';

export class UserProjectCountDto {
  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  total: number;

  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  active: number;

  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  finished: number;
}

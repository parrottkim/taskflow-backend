import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class PositionDto {
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
}

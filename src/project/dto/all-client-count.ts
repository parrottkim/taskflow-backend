import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import { IsInt, IsNotEmpty } from 'class-validator';

export class AllClientCountDto {
  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  @Transform(({ value }) => Number(value))
  @Expose()
  depth: number;

  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  @Transform(({ value }) => Number(value))
  @Expose()
  count: number;
}

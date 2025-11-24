import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class TripRegulationDto {
  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  @Expose()
  id: number;

  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  @Expose()
  stepId: number;

  @ApiProperty()
  @Transform(({ value }) => Number(value).toLocaleString('ko-KR'))
  @IsString()
  @IsNotEmpty()
  @Expose()
  rate: string;
}

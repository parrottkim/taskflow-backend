import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, Max, Min } from 'class-validator';

export class GetHolidaysDto {
  @ApiProperty({ example: 2026, description: '조회 연도' })
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(9999)
  year: number;

  @ApiProperty({ example: 5, description: '조회 월' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;
}

export class GetHolidaysBetweenDto {
  @ApiProperty({
    example: '2026-05-01',
    description: '조회 시작일(YYYY-MM-DD)',
  })
  @IsDateString({ strict: true })
  start: string;

  @ApiProperty({
    example: '2026-05-31',
    description: '조회 종료일(YYYY-MM-DD)',
  })
  @IsDateString({ strict: true })
  end: string;
}

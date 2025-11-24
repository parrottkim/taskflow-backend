import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
} from 'class-validator';

export class TripActualExpenseDto {
  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  @Expose()
  id: number;

  @ApiProperty({ description: '경비 항목 스텝 ID (예: 교통비, 숙박비 스텝)' })
  @IsInt()
  @IsNotEmpty()
  @Expose()
  stepId: number;

  @ApiProperty({ description: '실제 지출 금액' })
  @Transform(({ value }) => value.toLocaleString('ko-KR'))
  @IsNumber()
  @IsOptional()
  @Expose()
  price?: number; // DB 저장 시 숫자(Number) 타입 권장

  @ApiProperty({ description: '상세 내용' })
  @IsString()
  @IsOptional()
  @Expose()
  details?: string;
}

export class TripRegulationRateDto {
  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  @Expose()
  id: number;

  @ApiProperty({
    description: '규정 정산 항목 스텝 ID (예: 국내 숙박비 스텝 ID)',
  })
  @IsInt()
  @IsNotEmpty()
  @Expose()
  stepId: number; // 숙박비/일비 등 규정 항목 스텝 ID

  @ApiProperty({ description: '정산 대상 일수' })
  @Transform(({ value }) => value.toLocaleString('ko-KR'))
  @IsInt()
  @IsNotEmpty()
  @Expose()
  days: number;

  @ApiProperty({ description: '적용된 규정 단가' })
  @Transform(({ value }) => value.toLocaleString('ko-KR'))
  @IsNumber()
  @IsNotEmpty()
  @Expose()
  rate: number; // 규정 단가 (DB 저장 시 숫자 타입 권장)

  @ApiProperty({ description: '상세 내용' })
  @IsString()
  @IsOptional()
  @Expose()
  details?: string;
}

export class TripFuelExpenseDto {
  @ApiProperty()
  @Transform(({ value }) => value.toLocaleString('ko-KR'))
  @Expose()
  @IsNumber()
  rate: number;

  @ApiProperty()
  @Transform(({ value }) => value.toLocaleString('ko-KR'))
  @Expose()
  @IsNumber()
  mileage: number;

  @ApiProperty()
  @Transform(({ value }) => value.toLocaleString('ko-KR'))
  @Expose()
  @IsNumber()
  distance: number;
}

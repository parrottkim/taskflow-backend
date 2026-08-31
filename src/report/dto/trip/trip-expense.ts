import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsDate,
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

  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  @Transform(({ obj }) => obj.currency?.id ?? obj.currencyId)
  @Expose()
  currencyId: number;

  @ApiProperty({
    description: '외화 경비 결제일',
    required: false,
    nullable: true,
  })
  @Type(() => Date)
  @IsOptional()
  @IsDate()
  @Expose()
  paymentDate?: Date | null;

  @ApiProperty({ description: '원화 환산에 적용한 환율' })
  @IsNumber()
  @Expose()
  exchangeRate: number;

  @ApiProperty({
    description: '환율 적용 기준일',
    required: false,
    nullable: true,
  })
  @Type(() => Date)
  @IsOptional()
  @IsDate()
  @Expose()
  exchangeRateAppliedDate?: Date | null;

  @ApiProperty({ description: '환율을 적용한 원화 금액' })
  @Transform(({ obj }) =>
    Math.round(Number(obj.price) * Number(obj.exchangeRate ?? 1)),
  )
  @IsNumber()
  @Expose()
  convertedPrice: number;

  @ApiProperty({ description: '실제 지출 금액' })
  @Transform(({ value, obj }) => {
    if (value == null) {
      return value;
    }

    const fractionDigits = (obj.currency?.code ?? 'KRW') === 'KRW' ? 0 : 2;

    return Number(value).toLocaleString('ko-KR', {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
  })
  @IsString()
  @IsOptional()
  @Expose()
  price?: string;

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

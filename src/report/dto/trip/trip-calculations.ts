import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

// 단일 계산 DTO: 국내/해외 공용
export class TripCalculationsDto {
  @ApiProperty({ description: '총 비용' })
  @Expose()
  totalCost: number;

  @ApiProperty({
    description: '과세 대상 금액 (ex: 숙박비 정산액)',
    required: false,
  })
  @Expose()
  taxableAmount?: number;

  @ApiProperty({
    description: '비과세 금액 (ex: 일비 + 개인차량 유류비)',
    required: false,
  })
  @Expose()
  nonTaxableAmount?: number;

  @ApiProperty({
    description: '환율',
  })
  @Expose()
  exchangeRate?: number;
}

import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class ProjectCostSummaryDto {
  @ApiProperty({ description: '계약금액(원)' })
  @Expose()
  contractAmount: number;

  @ApiProperty({ description: '구매금액(원)' })
  @Expose()
  purchaseAmount: number;

  @ApiProperty({ description: '출장비 정산액(원)' })
  @Expose()
  tripSettlementAmount: number;

  @ApiProperty({ description: '구매금액과 출장비 정산액의 합계(원)' })
  @Expose()
  totalCost: number;

  @ApiProperty({ description: '계약금액에서 비용합계를 뺀 금액(원)' })
  @Expose()
  profitAmount: number;
}

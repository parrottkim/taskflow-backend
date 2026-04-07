import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsDate, IsNumber, IsOptional } from 'class-validator';

export class TripExchangeRateDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty({ description: '적용 환율 (1 USD = rate KRW)' })
  @IsNumber()
  @Expose()
  rate: number;

  @ApiProperty({ description: '환율 적용 기준일' })
  @Type(() => Date)
  @IsDate()
  @Expose()
  appliedDate: Date;

  @ApiProperty({ required: false, nullable: true })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  @Expose()
  deletedAt?: Date | null;
}

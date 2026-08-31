import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsDate, IsDateString, IsNumber, IsOptional } from 'class-validator';

export class TripExchangeRateDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty({ description: '적용 환율 (1 USD = rate KRW)' })
  @IsNumber()
  @Expose()
  rate: number;

  @ApiProperty({ description: '환율 적용 기준일' })
  @IsDateString({ strict: true })
  @Expose()
  appliedDate: string;

  @ApiProperty({ required: false, nullable: true })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  @Expose()
  deletedAt?: Date | null;
}

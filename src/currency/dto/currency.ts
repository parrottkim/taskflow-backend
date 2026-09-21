import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class GetExchangeRateDto {
  @ApiProperty({ type: String, format: 'date' })
  @IsDateString({ strict: true })
  date: string;

  @ApiPropertyOptional({ enum: ['USD', 'CNH', 'EUR'], default: 'USD' })
  @IsString()
  @IsOptional()
  currency: string = 'USD';
}

export class CurrencyDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  code: string;

  @ApiProperty()
  @Expose()
  symbol: string;
}

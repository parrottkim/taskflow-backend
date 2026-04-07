import { ApiProperty } from '@nestjs/swagger';
import { Type, Expose } from 'class-transformer';
import {
  ValidateNested,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';
import {
  TripActualExpenseDto,
  TripRegulationRateDto,
  TripFuelExpenseDto,
} from './trip-expense';
import { TripCalculationsDto } from './trip-calculations';
import { TripExchangeRateDto } from './trip-exchange-rate';

export class TripReportDto {
  @ApiProperty({ type: [TripActualExpenseDto] })
  @ValidateNested({ each: true })
  @Type(() => TripActualExpenseDto)
  @Expose()
  expenses: TripActualExpenseDto[];

  @ApiProperty({ type: [TripRegulationRateDto] })
  @ValidateNested({ each: true })
  @Type(() => TripRegulationRateDto)
  @Expose()
  rates: TripRegulationRateDto[];

  @ApiProperty({ type: TripFuelExpenseDto })
  @Type(() => TripFuelExpenseDto)
  @Expose()
  fuel: TripFuelExpenseDto;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  @Expose()
  isDeducted?: boolean;

  @ApiProperty({ type: TripCalculationsDto, required: false })
  @Type(() => TripCalculationsDto)
  @IsOptional()
  @Expose()
  calculations?: TripCalculationsDto;

  @ApiProperty({ type: TripExchangeRateDto, required: false, nullable: true })
  @Type(() => TripExchangeRateDto)
  @IsOptional()
  @Expose()
  exchangeRate?: TripExchangeRateDto | null;
}

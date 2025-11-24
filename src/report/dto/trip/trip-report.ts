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
}

import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { UpdateScheduleHolidayDto } from '@/schedule/dto/update-schedule-holiday';

export class DailyAllowancePreviewExpenseDto {
  @ApiProperty({ example: 18 })
  @IsInt()
  stepId: number;

  @ApiProperty({ example: 100 })
  @Transform(({ value }) =>
    typeof value === 'string' ? Number(value.replaceAll(',', '')) : value,
  )
  @IsNumber()
  price: number;
}

export class PreviewDailyAllowanceDto {
  @ApiProperty({ example: 123 })
  @IsInt()
  scheduleId: number;

  @ApiProperty({
    type: [UpdateScheduleHolidayDto],
    required: false,
    description: '국내 출장 기간의 주말·공휴일 입력값',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateScheduleHolidayDto)
  holidays?: UpdateScheduleHolidayDto[];

  @ApiProperty({
    type: [DailyAllowancePreviewExpenseDto],
    required: false,
    description: '해외 일비 10% 공제 여부를 계산할 현재 작성 중 경비',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DailyAllowancePreviewExpenseDto)
  expenses?: DailyAllowancePreviewExpenseDto[];
}

export class DomesticHolidayDaysDto {
  @ApiProperty({ description: '휴일·공휴일 중 업무를 수행한 일수', example: 1 })
  workDays: number;

  @ApiProperty({
    description: '휴일·공휴일 중 이동만 한 환산 일수. 날짜당 0.5일',
    example: 0.5,
  })
  travelDays: number;
}

export class OverseasSpecialAllowanceDto {
  @ApiProperty({ description: '설날·추석 특별수당 적용 일수', example: 2 })
  days: number;

  @ApiProperty({ description: '설날·추석 특별수당 단가', example: 100 })
  rate: number;

  @ApiProperty({ description: '설날·추석 특별수당 금액', example: 200 })
  amount: number;
}

export class DailyAllowancePreviewDto {
  @ApiProperty({
    description: '시작일과 종료일을 포함한 총 출장 일수',
    example: 5,
  })
  totalTripDays: number;

  @ApiProperty({
    type: DomesticHolidayDaysDto,
    required: false,
    description: '국내 출장 휴일·공휴일 근무 및 이동 일수',
  })
  domestic?: DomesticHolidayDaysDto;

  @ApiProperty({
    type: OverseasSpecialAllowanceDto,
    required: false,
    description: '해외 출장 설날·추석 특별수당',
  })
  overseas?: OverseasSpecialAllowanceDto;

  @ApiProperty({ example: 35000 })
  dailyRate: number;

  @ApiProperty({
    description: '총 출장 일수 × 일비 단가',
    example: 175000,
  })
  dailyAmount: number;

  @ApiProperty({ example: 0 })
  deductionRate: number;

  @ApiProperty({ example: 1 })
  exchangeRate: number;

  @ApiProperty({ example: 175000 })
  totalAmount: number;

  @ApiProperty({ example: 'KRW' })
  currencyCode: 'KRW' | 'USD';
}

import { ApiProperty } from '@nestjs/swagger';
import { Type, Expose, Transform } from 'class-transformer';
import {
  IsNumber,
  IsNotEmpty,
  ValidateNested,
  IsOptional,
  IsString,
  IsBoolean,
} from 'class-validator';

export class CreateActualExpenseDto {
  @ApiProperty({ description: '연결할 TripStep ID', example: 5 })
  @IsNumber()
  @IsNotEmpty()
  stepId: number;

  @ApiProperty({ description: '지출 금액', example: 15000 })
  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => {
    // 쉼표(,)를 제거하고 숫자로 변환합니다.
    if (typeof value === 'string') {
      return parseInt(value.replace(/,/g, ''), 10);
    }
    // 이미 숫자이거나 다른 타입이면 그대로 반환
    return value;
  })
  price: number;

  @ApiProperty({
    description: '지출 상세 내용',
    required: false,
    example: '여행 1일차 식비',
  })
  @IsOptional()
  @IsString()
  details?: string;
}

export class CreateRegulationRateDto {
  @ApiProperty({ description: 'TripStep ID', example: 12 })
  @IsNumber()
  @IsNotEmpty()
  stepId: number;

  @ApiProperty({ description: '규정 적용 일수', example: 2 })
  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => {
    // 쉼표(,)를 제거하고 숫자로 변환합니다.
    if (typeof value === 'string') {
      return parseInt(value.replace(/,/g, ''), 10);
    }
    // 이미 숫자이거나 다른 타입이면 그대로 반환
    return value;
  })
  days: number;

  @ApiProperty({ description: '규정 적용 요율/금액', example: 80.0 })
  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => {
    // 쉼표(,)를 제거하고 숫자로 변환합니다.
    if (typeof value === 'string') {
      return parseInt(value.replace(/,/g, ''), 10);
    }
    // 이미 숫자이거나 다른 타입이면 그대로 반환
    return value;
  })
  rate: number;

  @ApiProperty({
    description: '규정 상세 내용',
    required: false,
    example: '숙박비 일일 한도 규정',
  })
  @IsOptional()
  @IsString()
  details?: string;
}

export class CreateFuelExpenseDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const cleanValue = value.replace(/,/g, '');
      return parseFloat(cleanValue);
    }
    return String(value);
  })
  rate: number;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => {
    // 쉼표(,)를 제거하고 숫자로 변환합니다.
    if (typeof value === 'string') {
      return parseInt(value.replace(/,/g, ''), 10);
    }
    // 이미 숫자이거나 다른 타입이면 그대로 반환
    return value;
  })
  mileage: number;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => {
    // 쉼표(,)를 제거하고 숫자로 변환합니다.
    if (typeof value === 'string') {
      return parseInt(value.replace(/,/g, ''), 10);
    }
    // 이미 숫자이거나 다른 타입이면 그대로 반환
    return value;
  })
  distance: number;
}

export class CreateTripDto {
  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  scheduleId: number;

  @ApiProperty({ type: [CreateActualExpenseDto] })
  @ValidateNested({ each: true })
  @Type(() => CreateActualExpenseDto)
  expenses: CreateActualExpenseDto[];

  @ApiProperty({ type: [CreateRegulationRateDto] })
  @ValidateNested({ each: true })
  @Type(() => CreateRegulationRateDto)
  rates: CreateRegulationRateDto[];

  @ApiProperty({ type: CreateFuelExpenseDto })
  @IsOptional()
  @Type(() => CreateFuelExpenseDto)
  fuel?: CreateFuelExpenseDto;

  @ApiProperty()
  @IsBoolean()
  @IsNotEmpty()
  isDeducted: boolean;
}

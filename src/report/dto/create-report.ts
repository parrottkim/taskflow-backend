import { ApiProperty } from '@nestjs/swagger';
import { Type, Expose, Transform } from 'class-transformer';
import {
  IsNumber,
  IsNotEmpty,
  ValidateNested,
  IsOptional,
  IsString,
  IsBoolean,
  IsDateString,
  Matches,
  IsDate,
} from 'class-validator';
import { ReportAttachmentDto } from './report-attachment';
import { UpdateScheduleHolidayDto } from '@/schedule/dto/update-schedule-holiday';

export class CreateActualExpenseDto {
  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  stepId: number;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsNumber()
  currencyId?: number;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  paymentDate?: Date;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return parseFloat(value.replace(/,/g, ''));
    }
    return value;
  })
  price: number;

  @ApiProperty()
  @IsOptional()
  @IsString()
  details?: string;
}

export class CreateRegulationRateDto {
  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  stepId: number;

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
  days: number;

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

// ⭐️ 새로운 DTO: TripReport 생성 전용
export class CreateTripReportDto {
  @ApiProperty()
  @ValidateNested({ each: true })
  @Type(() => CreateActualExpenseDto)
  expenses: CreateActualExpenseDto[];

  @ApiProperty()
  @ValidateNested({ each: true })
  @Type(() => CreateRegulationRateDto)
  rates: CreateRegulationRateDto[];

  @ApiProperty()
  @IsOptional()
  @Type(() => CreateFuelExpenseDto)
  fuel?: CreateFuelExpenseDto;

  @ApiProperty({
    description:
      '공제 여부. 해외 출장(category 2)은 택시/렌탈 비용에 따라 서버에서 자동 계산',
  })
  @IsOptional()
  @IsBoolean()
  isDeducted?: boolean;

  @ApiProperty({
    type: [UpdateScheduleHolidayDto],
    required: false,
    description: '국내 출장 기간 중 주말/공휴일별 이동 여부와 대체휴무 기록',
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateScheduleHolidayDto)
  holidays?: UpdateScheduleHolidayDto[];
}

// ⭐️ Report 생성 DTO (공통 필드만 포함)
export class CreateReportDto {
  @ApiProperty({ description: '연결할 스케줄 ID' })
  @IsNumber()
  @IsOptional()
  scheduleId?: number;

  @ApiProperty({ description: '연결할 프로젝트 ID' })
  @IsNumber()
  @IsNotEmpty()
  projectId: number;

  @ApiProperty({
    description: '보고서 상세 내용 (원격 대응 시 필수, 출장 명령서 공통)',
    example: '원격 대응 결과',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ type: [ReportAttachmentDto], description: '첨부 파일 목록' })
  @ValidateNested({ each: true })
  @Type(() => ReportAttachmentDto)
  attachments: ReportAttachmentDto[];

  @ApiProperty({
    type: CreateTripReportDto,
    required: false,
    description: '출장 보고서 상세 (출장 명령서일 경우 필요)',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateTripReportDto)
  trip?: CreateTripReportDto;
}

import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  ValidateNested,
  IsBoolean,
  IsString,
} from 'class-validator';
import {
  CreateActualExpenseDto,
  CreateFuelExpenseDto,
  CreateRegulationRateDto,
  CreateReportDto,
  CreateTripReportDto,
} from './create-report';
import { Type } from 'class-transformer';
// import { ReportAttachmentDto } from './report-attachment'; // 필요 시 주석 해제

// --- 기존 UpdateActualExpenseDto, UpdateRegulationRateDto, UpdateFuelExpenseDto 정의 유지 ---
// 이 DTO들은 PartialType을 상속받아 필드가 optional 상태입니다.

export class UpdateActualExpenseDto extends PartialType(
  CreateActualExpenseDto,
) {
  @ApiProperty({
    description: '수정/삭제/추가할 지출 ID (없으면 추가)',
    required: false,
    example: 10,
  })
  @IsOptional()
  @IsNumber()
  id?: number;
}

export class UpdateRegulationRateDto extends PartialType(
  CreateRegulationRateDto,
) {
  @ApiProperty({
    description: '수정/삭제/추가할 규정 요율 ID (없으면 추가)',
    required: false,
    example: 20,
  })
  @IsOptional()
  @IsNumber()
  id?: number;
}

export class UpdateFuelExpenseDto extends PartialType(CreateFuelExpenseDto) {
  @ApiProperty({
    description: '수정/삭제/추가할 연료 비용 ID (없으면 추가)',
    required: false,
    example: 20,
  })
  @IsOptional()
  @IsNumber()
  id?: number;
}

// -----------------------------------------------------------------------------------

// 1. OmitType을 사용하여 CreateTripReportDto에서 복잡한 중첩 필드를 제거
export class UpdateTripReportBaseDto extends OmitType(CreateTripReportDto, [
  'expenses',
  'rates',
  'fuel',
] as const) {}

// 2. PartialType을 상속받아 모든 필드를 optional로 만들고,
//    충돌을 일으키는 필드들을 Update DTO 타입으로 재정의
export class UpdateTripReportDto extends PartialType(UpdateTripReportBaseDto) {
  @ApiProperty({
    type: [UpdateActualExpenseDto],
    required: false,
    description: '실제 지출 비용 목록 (업데이트용)',
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateActualExpenseDto)
  expenses?: UpdateActualExpenseDto[];

  @ApiProperty({
    type: [UpdateRegulationRateDto],
    required: false,
    description: '규정 요율 목록 (업데이트용)',
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateRegulationRateDto)
  rates?: UpdateRegulationRateDto[];

  // ⭐️ [수정] 충돌을 피하기 위해 UpdateFuelExpenseDto로 명시적으로 재정의
  @ApiProperty({
    type: UpdateFuelExpenseDto,
    required: false,
    description: '유류 비용 (업데이트용)',
  })
  @IsOptional()
  @Type(() => UpdateFuelExpenseDto)
  fuel?: UpdateFuelExpenseDto;

  @ApiProperty({ required: false, description: '공제 여부 (업데이트용)' })
  @IsOptional()
  @IsBoolean()
  isDeducted?: boolean;
}

// 3. Report 업데이트 DTO (공통 필드)
// CreateReportDto에서 tripReport 필드가 Optional이기 때문에 OmitType을 사용할 필요가 없습니다.
export class UpdateReportDto extends OmitType(CreateReportDto, [
  'trip',
] as const) {
  // tripReport는 PartialType으로 이미 UpdateTripReportDto 타입으로 추론됩니다.
  // 다만, 명시적으로 타입을 지정해주는 것이 좋습니다.

  @ApiProperty({
    type: UpdateTripReportDto,
    required: false,
    description: '출장 보고서 상세 (수정 시 제출)',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateTripReportDto)
  trip?: UpdateTripReportDto;
}

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

  @ApiProperty({
    required: false,
    description:
      '공제 여부. 해외 출장(category 2)은 택시/렌탈 비용에 따라 서버에서 자동 계산',
  })
  @IsOptional()
  @IsBoolean()
  isDeducted?: boolean;
}

export class UpdateReportDto extends OmitType(CreateReportDto, [
  'trip',
] as const) {
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

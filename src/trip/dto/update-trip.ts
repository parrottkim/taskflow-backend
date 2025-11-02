import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { IsNumber, IsOptional, ValidateNested } from 'class-validator';
import {
  CreateActualExpenseDto,
  CreateFuelExpenseDto,
  CreateRegulationRateDto,
  CreateTripDto,
} from './create-trip';
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

export class UpdateTripDto extends OmitType(CreateTripDto, [
  'expenses',
  'rates',
  'fuel',
] as const) {
  @ApiProperty()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateActualExpenseDto)
  expenses?: UpdateActualExpenseDto[];

  @ApiProperty()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateRegulationRateDto)
  rates?: UpdateRegulationRateDto[];

  @ApiProperty()
  @IsOptional()
  @Type(() => UpdateFuelExpenseDto)
  fuel?: UpdateFuelExpenseDto;
}

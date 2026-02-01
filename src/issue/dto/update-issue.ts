import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString } from 'class-validator';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import {
  CreateContractIssueItemDto,
  CreateProcurementIssueDto,
  CreateProcurementIssueItemDto,
  CreateTransactionIssueItemDto,
  CreateIssueDto,
} from './create-issue';
import { IssueAttachmentDto } from './issue-attachment';

export class UpdateContractIssueItemDto extends PartialType(
  CreateContractIssueItemDto,
) {
  @ApiProperty()
  @IsOptional()
  @IsNumber()
  id?: number;
}

// Procurement
export class UpdateProcurementIssueDto extends PartialType(
  CreateProcurementIssueDto,
) {
  @ApiProperty()
  @IsOptional()
  @IsNumber()
  id?: number;
}

export class UpdateProcurementIssueItemDto extends PartialType(
  CreateProcurementIssueItemDto,
) {
  @ApiProperty()
  @IsOptional()
  @IsNumber()
  id?: number;
}

export class UpdateTransactionIssueItemDto extends PartialType(
  CreateTransactionIssueItemDto,
) {
  @ApiProperty()
  @IsOptional()
  @IsNumber()
  id?: number;
}

// 공통 Issue 수정 DTO
export class UpdateIssueDto extends OmitType(PartialType(CreateIssueDto), [
  'contractItems',
  'transactionItems',
  'procurementItems',
]) {
  @ApiProperty()
  @IsOptional()
  @IsNumber()
  id?: number;

  @ApiProperty({ required: false, type: [UpdateContractIssueItemDto] })
  @ValidateNested({ each: true })
  @Type(() => UpdateContractIssueItemDto)
  @IsOptional()
  contractItems?: UpdateContractIssueItemDto[];

  @ApiProperty({ required: false, type: [UpdateTransactionIssueItemDto] })
  @ValidateNested({ each: true })
  @Type(() => UpdateTransactionIssueItemDto)
  @IsOptional()
  transactionItems?: UpdateTransactionIssueItemDto[];

  @ApiProperty({ required: false, type: [UpdateProcurementIssueItemDto] })
  @ValidateNested({ each: true })
  @Type(() => UpdateProcurementIssueItemDto)
  @IsOptional()
  procurementItems?: UpdateProcurementIssueItemDto[];
}

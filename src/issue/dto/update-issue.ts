import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import {
  CreateContractIssueDto,
  CreateKickoffIssueDto,
  CreateApprovalIssueDto,
  CreateProcurementIssueDto,
  CreateTransactionIssueDto,
  CreatePaymentIssueDto,
} from './create-issue';
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsNumber,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';
import {
  UpdateContractIssueItemDto,
  UpdateTransactionIssueItemDto,
  UpdateProcurementIssueItemDto,
} from './update-issue-item';

export class UpdateContractIssueDto extends OmitType(
  PartialType(CreateContractIssueDto),
  ['contractItems', 'transactionItems'],
) {
  @ApiProperty({ required: false, type: [UpdateContractIssueItemDto] })
  @ValidateNested({ each: true })
  @Type(() => UpdateContractIssueItemDto)
  @IsNotEmpty()
  contractItems: UpdateContractIssueItemDto[];

  @ApiProperty({ required: false, type: [UpdateTransactionIssueItemDto] })
  @ValidateNested({ each: true })
  @Type(() => UpdateTransactionIssueItemDto)
  @IsNotEmpty()
  transactionItems: UpdateTransactionIssueItemDto[];
}

export class UpdateKickoffIssueDto extends PartialType(CreateKickoffIssueDto) {}

export class UpdateApprovalIssueDto extends PartialType(
  CreateApprovalIssueDto,
) {}

export class UpdateProcurementIssueDto extends OmitType(
  PartialType(CreateProcurementIssueDto),
  ['procurementItems'],
) {
  @ApiProperty({ required: false, type: [UpdateProcurementIssueItemDto] })
  @ValidateNested({ each: true })
  @Type(() => UpdateProcurementIssueItemDto)
  @IsNotEmpty()
  procurementItems: UpdateProcurementIssueItemDto[];
}

export class UpdateTransactionIssueDto extends OmitType(
  PartialType(CreateTransactionIssueDto),
  ['transactionItems'],
) {
  @ApiProperty({ required: false, type: [UpdateTransactionIssueItemDto] })
  @ValidateNested({ each: true })
  @Type(() => UpdateTransactionIssueItemDto)
  @IsNotEmpty()
  transactionItems: UpdateTransactionIssueItemDto[];
}

export class UpdatePaymentIssueDto extends PartialType(CreatePaymentIssueDto) {}

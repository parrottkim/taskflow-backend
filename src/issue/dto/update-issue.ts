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
import { IsOptional, ValidateNested, IsNotEmpty } from 'class-validator';
import {
  UpdateContractIssueItemDto,
  UpdateKickoffIssueParticipantItemDto,
  UpdateKickoffIssueTripItemDto,
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

export class UpdateKickoffIssueDto extends OmitType(
  PartialType(CreateKickoffIssueDto),
  ['participantItems', 'tripItems'],
) {
  @ApiProperty({
    required: false,
    type: [UpdateKickoffIssueParticipantItemDto],
  })
  @ValidateNested({ each: true })
  @Type(() => UpdateKickoffIssueParticipantItemDto)
  @IsOptional()
  participantItems?: UpdateKickoffIssueParticipantItemDto[];

  @ApiProperty({ required: false, type: [UpdateKickoffIssueTripItemDto] })
  @ValidateNested({ each: true })
  @Type(() => UpdateKickoffIssueTripItemDto)
  @IsOptional()
  tripItems?: UpdateKickoffIssueTripItemDto[];
}

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

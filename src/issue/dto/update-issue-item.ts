import { PartialType, ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber } from 'class-validator';
import {
  CreateContractIssueItemDto,
  CreateKickoffParticipantItemDto,
  CreateKickoffTripItemDto,
  CreateProcurementIssueItemDto,
  CreateTransactionIssueItemDto,
} from './create-issue-item';

export class UpdateContractIssueItemDto extends PartialType(
  CreateContractIssueItemDto,
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

export class UpdateKickoffIssueParticipantItemDto extends PartialType(
  CreateKickoffParticipantItemDto,
) {
  @ApiProperty()
  @IsOptional()
  @IsNumber()
  id?: number;
}

export class UpdateKickoffIssueTripItemDto extends PartialType(
  CreateKickoffTripItemDto,
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

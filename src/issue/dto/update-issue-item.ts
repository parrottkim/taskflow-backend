import { PartialType, ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber } from 'class-validator';
import {
  CreateContractIssueItemDto,
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

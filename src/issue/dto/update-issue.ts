import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import {
  UpdateContractIssueDetailsDto,
  UpdateKickoffIssueDetailsDto,
  UpdateApprovalIssueDetailsDto,
  UpdateProcurementIssueDetailsDto,
  UpdateTransactionIssueDetailsDto,
  UpdateDeclarationIssueDetailsDto,
  UpdatePaymentIssueDetailsDto,
} from './update-issue-details';
import { IssueAttachmentDto } from './issue-attachment';

export class UpdateIssueDto {
  @ApiProperty()
  @IsInt()
  @IsOptional()
  projectId?: number;

  @ApiProperty()
  @Type()
  @ApiProperty()
  @IsInt()
  @IsOptional()
  categoryId?: number;

  @ApiProperty()
  @IsString()
  @IsOptional()
  content?: string;

  @ApiProperty()
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateContractIssueDetailsDto)
  contract?: UpdateContractIssueDetailsDto;

  @ApiProperty()
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateKickoffIssueDetailsDto)
  kickoff?: UpdateKickoffIssueDetailsDto;

  @ApiProperty()
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateApprovalIssueDetailsDto)
  approval?: UpdateApprovalIssueDetailsDto;

  @ApiProperty()
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateProcurementIssueDetailsDto)
  procurement?: UpdateProcurementIssueDetailsDto;

  @ApiProperty()
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateTransactionIssueDetailsDto)
  transaction?: UpdateTransactionIssueDetailsDto;

  @ApiProperty()
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateDeclarationIssueDetailsDto)
  declaration?: UpdateDeclarationIssueDetailsDto;

  @ApiProperty()
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdatePaymentIssueDetailsDto)
  payment?: UpdatePaymentIssueDetailsDto;

  @ApiProperty()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IssueAttachmentDto)
  attachments?: IssueAttachmentDto[];
}

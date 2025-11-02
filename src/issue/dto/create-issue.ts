import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import {
  CreateContractIssueDetailsDto,
  CreateKickoffIssueDetailsDto,
  CreateProcurementIssueDetailsDto,
  CreateTransactionIssueDetailsDto,
} from './create-issue-details';

export class CreateIssueDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  projectId: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  categoryId: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty()
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateContractIssueDetailsDto)
  contract?: CreateContractIssueDetailsDto;

  @ApiProperty()
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateKickoffIssueDetailsDto)
  kickoff?: CreateKickoffIssueDetailsDto;

  // @ApiProperty()
  // @IsOptional()
  // @ValidateNested()
  // @Type(() => CreateApprovalIssueDetailsDto)
  // approval?: CreateApprovalIssueDetailsDto;

  @ApiProperty()
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateProcurementIssueDetailsDto)
  procurement?: CreateProcurementIssueDetailsDto;

  @ApiProperty()
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateTransactionIssueDetailsDto)
  transaction?: CreateTransactionIssueDetailsDto;

  // @ApiProperty()
  // @IsOptional()
  // @ValidateNested()
  // @Type(() => CreateDeclarationIssueDetailsDto)
  // declaration?: CreateDeclarationIssueDetailsDto;

  // @ApiProperty()
  // @IsOptional()
  // @ValidateNested()
  // @Type(() => CreatePaymentIssueDetailsDto)
  // payment?: CreatePaymentIssueDetailsDto;
}

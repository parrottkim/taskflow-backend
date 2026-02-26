import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
  IsDate,
  Min,
  IsBoolean,
  ValidateIf,
} from 'class-validator';
import { IssueAttachmentDto } from './issue-attachment';
import {
  CreateContractIssueItemDto,
  CreateTransactionIssueItemDto,
  CreateProcurementIssueItemDto,
} from './create-issue-item';
import { UpdateTransactionIssueItemDto } from './update-issue-item';

export class CreateContractIssueDto {
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
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  currencyId: number;

  @ApiProperty()
  @ValidateNested({ each: true })
  @Type(() => CreateContractIssueItemDto)
  @IsNotEmpty()
  contractItems: CreateContractIssueItemDto[];

  @ApiProperty()
  @ValidateNested({ each: true })
  @Type(() => CreateTransactionIssueItemDto)
  @IsNotEmpty()
  transactionItems: CreateTransactionIssueItemDto[];

  @ApiProperty({ type: [IssueAttachmentDto], description: '첨부 파일 목록' })
  @ValidateNested({ each: true })
  @Type(() => IssueAttachmentDto)
  attachments: IssueAttachmentDto[];
}

export class CreateKickoffIssueDto {
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
  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  kickoffDate: Date;

  @ApiProperty({ type: [IssueAttachmentDto], description: '첨부 파일 목록' })
  @ValidateNested({ each: true })
  @Type(() => IssueAttachmentDto)
  attachments: IssueAttachmentDto[];
}

export class CreateApprovalIssueDto {
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

  @ApiProperty({ type: [IssueAttachmentDto], description: '첨부 파일 목록' })
  @ValidateNested({ each: true })
  @Type(() => IssueAttachmentDto)
  attachments: IssueAttachmentDto[];
}

export class CreateProcurementIssueDto {
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
  @ValidateNested({ each: true })
  @Type(() => CreateProcurementIssueItemDto)
  @IsNotEmpty()
  procurementItems: CreateProcurementIssueItemDto[];

  @ApiProperty({ type: [IssueAttachmentDto], description: '첨부 파일 목록' })
  @ValidateNested({ each: true })
  @Type(() => IssueAttachmentDto)
  attachments: IssueAttachmentDto[];
}

export class CreateTransactionIssueDto {
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
  @ValidateNested({ each: true })
  @Type(() => UpdateTransactionIssueItemDto)
  @IsNotEmpty()
  transactionItems: UpdateTransactionIssueItemDto[];

  @ApiProperty({ type: [IssueAttachmentDto], description: '첨부 파일 목록' })
  @ValidateNested({ each: true })
  @Type(() => IssueAttachmentDto)
  attachments: IssueAttachmentDto[];
}

export class CreatePaymentIssueDto {
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

  @ApiProperty({ type: [IssueAttachmentDto], description: '첨부 파일 목록' })
  @ValidateNested({ each: true })
  @Type(() => IssueAttachmentDto)
  attachments: IssueAttachmentDto[];
}

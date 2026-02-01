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

export class CreateContractIssueItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  item: string;

  @ApiProperty()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return parseInt(value.replace(/,/g, ''), 10);
    }
    return value;
  })
  @IsInt()
  @IsNotEmpty()
  @Min(0)
  price: number;
}

// Procurement
export class CreateProcurementIssueItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  item: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  spec: string;

  @ApiProperty()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return parseInt(value.replace(/,/g, ''), 10);
    }
    return value;
  })
  @IsInt()
  @IsNotEmpty()
  quantity: number;

  @ApiProperty()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return parseInt(value.replace(/,/g, ''), 10);
    }
    return value;
  })
  @IsInt()
  @IsNotEmpty()
  unitPrice: number;

  @ApiProperty()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return parseInt(value.replace(/,/g, ''), 10);
    }
    return value;
  })
  @IsInt()
  @IsNotEmpty()
  totalAmount: number;

  @ApiProperty()
  @IsBoolean()
  @Type(() => Boolean)
  isOnlinePurchase: boolean = false;

  @ApiProperty()
  @ValidateIf((o) => o.isOnlinePurchase)
  @IsString()
  @IsNotEmpty()
  purchaseUrl?: string;

  @ApiProperty()
  @Type(() => Number)
  @ValidateIf((o) => !o.isOnlinePurchase)
  @IsInt()
  @IsNotEmpty()
  supplierId?: number;
}

export class CreateProcurementIssueDto {
  @ApiProperty()
  @ValidateNested({ each: true })
  @Type(() => CreateProcurementIssueItemDto)
  @IsOptional()
  items?: CreateProcurementIssueItemDto[];
}

export class CreateTransactionIssueItemDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  categoryId: number;

  @ApiProperty()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return parseInt(value.replace(/,/g, ''), 10);
    }
    return value;
  })
  @IsInt()
  @IsNotEmpty()
  @Min(0)
  price: number;

  @ApiProperty()
  @IsString()
  @IsOptional()
  note?: string;

  @ApiProperty()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return parseInt(value.replace(/,/g, ''), 10);
    }
    return value;
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  ratio?: number;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  isPaid?: boolean;

  @ApiProperty()
  @IsOptional()
  @IsString()
  paidAt?: string;
}

// 공통 Issue 생성 DTO
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
  @IsOptional()
  content?: string;

  @ApiProperty()
  @IsInt()
  @IsOptional()
  currencyId?: number;

  @ApiProperty()
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  kickoffDate?: Date;

  @ApiProperty()
  @ValidateNested({ each: true })
  @Type(() => CreateContractIssueItemDto)
  @IsOptional()
  contractItems?: CreateContractIssueItemDto[];

  @ApiProperty()
  @ValidateNested({ each: true })
  @Type(() => CreateTransactionIssueItemDto)
  @IsOptional()
  transactionItems?: CreateTransactionIssueItemDto[];

  @ApiProperty()
  @ValidateNested({ each: true })
  @Type(() => CreateProcurementIssueItemDto)
  @IsOptional()
  procurementItems?: CreateProcurementIssueItemDto[];

  @ApiProperty({ type: [IssueAttachmentDto], description: '첨부 파일 목록' })
  @ValidateNested({ each: true })
  @Type(() => IssueAttachmentDto)
  attachments: IssueAttachmentDto[];
}

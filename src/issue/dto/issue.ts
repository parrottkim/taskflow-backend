import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import {
  IsOptional,
  ValidateNested,
  IsInt,
  IsNotEmpty,
  IsBoolean,
  IsDate,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';
import { UserDto } from 'src/user/dto/user';
import { IssueAttachmentDto } from './issue-attachment';
import { IssueCategoryDto } from './issue-category';
import { CurrencyDto } from 'src/currency/dto/currency';
import { SupplierDto } from 'src/supplier/dto/supplier';

export class ContractIssueItemDto {
  @ApiProperty()
  @IsInt()
  @IsOptional()
  @Expose()
  id?: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Expose()
  item: string;

  @ApiProperty()
  @Transform(({ value }) => value.toLocaleString('ko-KR'))
  @IsInt()
  @IsNotEmpty()
  @Min(0)
  @Expose()
  price: number;
}

export class TransactionIssueItemCategoryDto {
  @ApiProperty()
  @IsInt()
  @Expose()
  id: number;

  @ApiProperty()
  @IsString()
  @Expose()
  name: string;
}

export class TransactionIssueItemDto {
  @ApiProperty()
  @IsInt()
  @IsOptional()
  @Expose()
  id?: number;

  @ApiProperty()
  @Type(() => TransactionIssueItemCategoryDto)
  @Expose()
  category: TransactionIssueItemCategoryDto;

  @ApiProperty()
  @Transform(({ value }) => value.toLocaleString('ko-KR'))
  @IsInt()
  @IsNotEmpty()
  @Min(0)
  @Expose()
  price: number;

  @ApiProperty()
  @Transform(({ value }) => value.toString())
  @IsInt()
  @IsNotEmpty()
  @Min(0)
  @Expose()
  ratio: number;

  @ApiProperty()
  @IsBoolean()
  @Expose()
  isPaid: boolean = false;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  @Expose()
  paidAt?: Date | null;

  @ApiProperty()
  @IsString()
  @IsOptional()
  @Expose()
  note?: string;
}

export class IssueDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Type(() => IssueCategoryDto)
  @Expose()
  category: IssueCategoryDto;

  @ApiProperty()
  @Type(() => UserDto)
  @Expose()
  user: UserDto;

  @ApiProperty()
  @Expose()
  content: string;

  @ApiProperty()
  @IsOptional()
  @Type(() => IssueAttachmentDto)
  @Expose()
  attachments?: IssueAttachmentDto[];

  @ApiProperty()
  @Expose()
  createdAt: Date;

  @ApiProperty()
  @Expose()
  updatedAt: Date;

  @ApiProperty()
  @IsOptional()
  @Expose()
  deletedAt?: Date | null;
}

export class ProcurementIssueItemDto {
  @ApiProperty()
  @IsInt()
  @IsOptional()
  @Expose()
  id?: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Expose()
  item: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Expose()
  spec: string;

  @ApiProperty()
  @Transform(({ value }) => value.toLocaleString('ko-KR'))
  @IsInt()
  @IsNotEmpty()
  @Min(0)
  @Expose()
  quantity: number;

  @ApiProperty()
  @Transform(({ value }) => value.toLocaleString('ko-KR'))
  @IsInt()
  @IsNotEmpty()
  @Min(0)
  @Expose()
  unitPrice: number;

  @ApiProperty()
  @Transform(({ value }) => value.toLocaleString('ko-KR'))
  @IsInt()
  @IsNotEmpty()
  @Min(0)
  @Expose()
  totalAmount: number;

  @ApiProperty()
  @IsBoolean()
  @Type(() => Boolean)
  @Expose()
  isOnlinePurchase: boolean = false;

  @ApiProperty()
  @ValidateIf((o) => o.isOnlinePurchase)
  @IsString()
  @IsOptional()
  @Expose()
  purchaseUrl?: string;

  @ApiProperty()
  @Type(() => SupplierDto)
  @IsOptional()
  @Expose()
  supplier?: SupplierDto;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  supplierId?: number;
}

export class KickoffIssueDto extends IssueDto {
  @ApiProperty()
  @Type(() => Date)
  @Expose()
  kickoffDate: Date;
}

export class ContractIssueDto extends IssueDto {
  @ApiProperty()
  @Type(() => CurrencyDto)
  @Expose()
  currency: CurrencyDto;

  @ApiProperty()
  @ValidateNested({ each: true })
  @Type(() => ContractIssueItemDto)
  @IsOptional()
  @Expose()
  contractItems: ContractIssueItemDto[];

  @ApiProperty()
  @ValidateNested({ each: true })
  @Type(() => TransactionIssueItemDto)
  @IsOptional()
  @Expose()
  transactionItems: TransactionIssueItemDto[];
}

export class TransactionIssueDto extends IssueDto {
  @ApiProperty()
  @Type(() => CurrencyDto)
  @Expose()
  currency: CurrencyDto;

  @ApiProperty()
  @ValidateNested({ each: true })
  @Type(() => ContractIssueItemDto)
  @IsOptional()
  @Expose()
  contractItems: ContractIssueItemDto[];

  @ApiProperty()
  @ValidateNested({ each: true })
  @Type(() => TransactionIssueItemDto)
  @IsOptional()
  @Expose()
  transactionItems: TransactionIssueItemDto[];
}

export class PaymentIssueDto extends IssueDto {}

export class DeclarationIssueDto extends IssueDto {}

export class ProcurementIssueDto extends IssueDto {
  @ApiProperty()
  @ValidateNested({ each: true })
  @Type(() => ProcurementIssueItemDto)
  @Expose()
  procurementItems: ProcurementIssueItemDto[];
}

export class IssueListDto {
  @ApiProperty()
  @Expose()
  items: any[];

  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  @Expose()
  page: number;

  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  @Expose()
  total: number;
}

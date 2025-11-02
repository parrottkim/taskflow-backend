import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsInt,
  IsNotEmpty,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { SupplierDto } from 'src/supplier/dto/supplier';

export class ContractIssueItemDto {
  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  @Expose()
  id: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Expose()
  item: string;

  @ApiProperty()
  @Transform(({ value }) => value.toLocaleString('ko-KR'))
  @IsInt()
  @IsNotEmpty()
  @Expose()
  price: number;
}

export class ProcurementIssueItemDto {
  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  @Expose()
  id: number;

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
  @Expose()
  quantity: number;

  @ApiProperty()
  @Transform(({ value }) => value.toLocaleString('ko-KR'))
  @IsInt()
  @IsNotEmpty()
  @Expose()
  unitPrice: number;

  @ApiProperty()
  @Transform(({ value }) => value.toLocaleString('ko-KR'))
  @IsInt()
  @IsNotEmpty()
  @Expose()
  totalAmount: number;

  @ApiProperty()
  @IsBoolean()
  @IsNotEmpty()
  @Expose()
  isOnlinePurchase: boolean = false;

  @ApiProperty()
  @ValidateIf((o) => o.isOnlinePurchase) // isOnlinePurchase가 true일 때만 검증/값이 존재할 수 있음
  @Expose()
  @IsString()
  purchaseUrl?: string;

  @ApiProperty()
  @Expose()
  @Type(() => SupplierDto)
  supplier: SupplierDto;
}

export class TransactionIssueItemCategoryDto {
  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  @Expose()
  id: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Expose()
  name: string;
}

export class TransactionIssueItemDto {
  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  @Expose()
  id: number;

  @ApiProperty()
  @Type(() => TransactionIssueItemCategoryDto)
  @Expose()
  category: TransactionIssueItemCategoryDto;

  @ApiProperty()
  @Transform(({ value }) => value.toLocaleString('ko-KR'))
  @IsInt()
  @IsNotEmpty()
  @Expose()
  price: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Expose()
  note: string;
}

export class ContractIssueDetailsDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Expose()
  type: string;

  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  @Expose()
  id: number;

  @ApiProperty({ type: [ContractIssueItemDto] })
  @ValidateNested({ each: true })
  @Type(() => ContractIssueItemDto)
  @Expose()
  items: ContractIssueItemDto[];
}

export class KickoffIssueDetailsDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Expose()
  type: string;

  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  @Expose()
  id: number;

  @ApiProperty()
  @IsDate()
  @IsNotEmpty()
  @Expose()
  kickoffDate: Date;
}

export class ApprovalIssueDetailsDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Expose()
  type: string;

  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  @Expose()
  id: number;
}

export class ProcurementIssueDetailsDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Expose()
  type: string;

  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  @Expose()
  id: number;

  @ApiProperty({ type: [ProcurementIssueItemDto] })
  @ValidateNested({ each: true })
  @Type(() => ProcurementIssueItemDto)
  @Expose()
  items: ProcurementIssueItemDto[];
}

export class TransactionIssueDetailsDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Expose()
  type: string;

  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  @Expose()
  id: number;

  @ApiProperty({ type: [TransactionIssueItemDto] })
  @ValidateNested({ each: true })
  @Type(() => TransactionIssueItemDto)
  @Expose()
  items: TransactionIssueItemDto[];
}

export class DeclarationIssueDetailsDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Expose()
  type: string;

  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  @Expose()
  id: number;
}

export class PaymentIssueDetailsDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Expose()
  type: string;

  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  @Expose()
  id: number;
}

export class IssueDetailsDto {}

import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class UpdateContractIssueItemDto {
  @ApiProperty()
  @IsInt()
  @IsOptional()
  id?: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  item: string;

  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  currencyId: number;

  @ApiProperty()
  @Transform(({ value }) => {
    // 쉼표(,)를 제거하고 숫자로 변환합니다.
    if (typeof value === 'string') {
      return parseInt(value.replace(/,/g, ''), 10);
    }
    // 이미 숫자이거나 다른 타입이면 그대로 반환
    return value;
  })
  @IsInt()
  @IsNotEmpty()
  @Min(0)
  price: number;
}

export class UpdateProcurementIssueItemDto {
  @ApiProperty()
  @IsInt()
  @IsOptional()
  id?: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  item: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  spec: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  quantity: number;

  @ApiProperty()
  @Transform(({ value }) => {
    // 쉼표(,)를 제거하고 숫자로 변환합니다.
    if (typeof value === 'string') {
      return parseInt(value.replace(/,/g, ''), 10);
    }
    // 이미 숫자이거나 다른 타입이면 그대로 반환
    return value;
  })
  @IsInt()
  @IsNotEmpty()
  @Min(0)
  unitPrice: number;

  @ApiProperty()
  @Transform(({ value }) => {
    // 쉼표(,)를 제거하고 숫자로 변환합니다.
    if (typeof value === 'string') {
      return parseInt(value.replace(/,/g, ''), 10);
    }
    // 이미 숫자이거나 다른 타입이면 그대로 반환
    return value;
  })
  @IsInt()
  @IsNotEmpty()
  @Min(0)
  totalAmount: number;

  @ApiProperty()
  @IsBoolean()
  @Type(() => Boolean)
  isOnlinePurchase: boolean = false;

  @ApiProperty()
  @ValidateIf((o) => o.isOnlinePurchase) // isOnlinePurchase가 true일 때만 유효성 검사
  @IsString()
  @IsNotEmpty()
  purchaseUrl?: string;

  @ApiProperty()
  @Type(() => Number)
  @ValidateIf((o) => !o.isOnlinePurchase) // isOnlinePurchase가 false일 때만 유효성 검사
  @IsInt()
  @IsNotEmpty()
  supplierId: number;
}

export class UpdateTransactionIssueItemDto {
  @ApiProperty()
  @IsInt()
  @IsOptional()
  id?: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  categoryId: number;

  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  currencyId: number;

  @ApiProperty()
  @Transform(({ value }) => {
    // 쉼표(,)를 제거하고 숫자로 변환합니다.
    if (typeof value === 'string') {
      return parseInt(value.replace(/,/g, ''), 10);
    }
    // 이미 숫자이거나 다른 타입이면 그대로 반환
    return value;
  })
  @IsInt()
  @IsNotEmpty()
  @Min(0)
  price: number;

  @ApiProperty()
  @IsString()
  @IsOptional()
  note: string;
}

export class UpdateContractIssueDetailsDto {
  @ApiProperty()
  @IsInt()
  @IsOptional()
  id?: number;

  @ApiProperty({ type: [UpdateContractIssueItemDto] })
  @ValidateNested({ each: true })
  @Type(() => UpdateContractIssueItemDto)
  items: UpdateContractIssueItemDto[];
}

export class UpdateKickoffIssueDetailsDto {
  @ApiProperty()
  @IsInt()
  @IsOptional()
  id?: number;

  @ApiProperty()
  @IsDate()
  @IsNotEmpty()
  @Transform(({ value }) => new Date(value))
  kickoffDate: Date;
}

export class UpdateApprovalIssueDetailsDto {
  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  id: number;
}

export class UpdateProcurementIssueDetailsDto {
  @ApiProperty()
  @IsInt()
  @IsOptional()
  id?: number;

  @ApiProperty({ type: [UpdateProcurementIssueItemDto] })
  @ValidateNested({ each: true })
  @Type(() => UpdateProcurementIssueItemDto)
  items: UpdateProcurementIssueItemDto[];
}

export class UpdateTransactionIssueDetailsDto {
  @ApiProperty()
  @IsInt()
  @IsOptional()
  id?: number;

  @ApiProperty({ type: [UpdateTransactionIssueItemDto] })
  @ValidateNested({ each: true })
  @Type(() => UpdateTransactionIssueItemDto)
  items: UpdateTransactionIssueItemDto[];
}

export class UpdateDeclarationIssueDetailsDto {
  @ApiProperty()
  @IsInt()
  @IsOptional()
  id?: number;
}

export class UpdatePaymentIssueDetailsDto {
  @ApiProperty()
  @IsInt()
  @IsOptional()
  id?: number;
}

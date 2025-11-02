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

export class CreateContractIssueItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  item: string;

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
  supplierId?: number;
}

export class CreateTransactionIssueItemDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  categoryId: number;

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

export class CreateContractIssueDetailsDto {
  @ApiProperty({ type: [CreateContractIssueItemDto] })
  @ValidateNested({ each: true })
  @Type(() => CreateContractIssueItemDto)
  items: CreateContractIssueItemDto[];
}

export class CreateKickoffIssueDetailsDto {
  @ApiProperty()
  @IsDate()
  @IsNotEmpty()
  @Transform(({ value }) => new Date(value))
  kickoffDate: Date;
}

export class CreateProcurementIssueDetailsDto {
  @ApiProperty({ type: [CreateProcurementIssueItemDto] })
  @ValidateNested({ each: true })
  @Type(() => CreateProcurementIssueItemDto)
  items: CreateProcurementIssueItemDto[];
}

export class CreateTransactionIssueDetailsDto {
  @ApiProperty({ type: [CreateTransactionIssueItemDto] })
  @ValidateNested({ each: true })
  @Type(() => CreateTransactionIssueItemDto)
  items: CreateTransactionIssueItemDto[];
}

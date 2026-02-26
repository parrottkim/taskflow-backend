import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  IsBoolean,
  ValidateIf,
  IsOptional,
} from 'class-validator';

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

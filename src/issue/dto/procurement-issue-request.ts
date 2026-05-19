import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import {
  ValidateNested,
  IsNotEmpty,
  IsDate,
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
} from 'class-validator';
import { CreateProcurementIssueItemDto } from './create-issue-item';
import { ProcurementIssueItemDto } from './issue';
import { UserDto } from '@/user/dto/user';
import { SupplierDto } from '@/supplier/dto/supplier';

export class ProcurementIssueRequestDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Type(() => UserDto)
  @Expose()
  user: UserDto;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  @Expose()
  orderDate: Date;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  @Expose()
  deliveryDate?: Date;

  @ApiProperty()
  @Expose()
  paymentTerms?: string;

  @ApiProperty()
  @Expose()
  serialNumber: string;

  @ApiProperty()
  @Type(() => SupplierDto)
  @Expose()
  supplier: SupplierDto;

  @ApiProperty()
  @IsBoolean()
  @Type(() => Boolean)
  @Expose()
  hasFee: boolean = false;

  @ApiProperty()
  @Expose()
  note?: string;

  @ApiProperty()
  @ValidateNested({ each: true })
  @Type(() => ProcurementIssueItemDto)
  @Expose()
  items: ProcurementIssueItemDto[];

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

export class CreateProcurementRequestDto {
  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  deliveryDate?: Date;

  @ApiProperty()
  @IsString()
  @IsOptional()
  paymentTerms?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  supplierId: number;

  @ApiProperty()
  @IsBoolean()
  @IsNotEmpty()
  hasFee: boolean;

  @ApiProperty()
  @IsString()
  @IsOptional()
  note?: string;

  @ApiProperty({ required: false, type: [CreateProcurementIssueItemDto] })
  @ValidateNested({ each: true })
  @Type(() => CreateProcurementIssueItemDto)
  @IsNotEmpty()
  items: CreateProcurementIssueItemDto[];
}

import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
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
import { UpdateProcurementIssueItemDto } from './update-issue-item';
import { ProcurementIssueRequestItemDto } from './issue';
import { UserDto } from '@/user/dto/user';
import { SupplierDto } from '@/supplier/dto/supplier';

export class ProcurementIssueRequestDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Type(() => UserDto)
  @Expose()
  requestedBy: UserDto;

  @ApiProperty()
  @Expose()
  title: string;

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
  @IsBoolean()
  @Type(() => Boolean)
  @Expose()
  requiresApproval: boolean = false;

  @ApiProperty()
  @IsBoolean()
  @Type(() => Boolean)
  @Expose()
  isApproved: boolean = false;

  @ApiProperty({ required: false })
  @Type(() => UserDto)
  @Expose()
  approvedBy?: UserDto;

  @ApiProperty({ required: false })
  @Type(() => Date)
  @IsDate()
  @Expose()
  approvedAt?: Date;

  @ApiProperty()
  @Expose()
  note?: string;

  @ApiProperty()
  @ValidateNested({ each: true })
  @Type(() => ProcurementIssueRequestItemDto)
  @Expose()
  items: ProcurementIssueRequestItemDto[];

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
  @IsString()
  @IsNotEmpty()
  title: string;

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

export class UpdateProcurementRequestDto extends PartialType(
  OmitType(CreateProcurementRequestDto, ['items']),
) {
  @ApiProperty({ type: [UpdateProcurementIssueItemDto] })
  @ValidateNested({ each: true })
  @Type(() => UpdateProcurementIssueItemDto)
  @IsNotEmpty()
  items: UpdateProcurementIssueItemDto[];
}

import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class SupplierKeywordDto {
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

export class SupplierDto {
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

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Expose()
  number: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  @Expose()
  phone?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  @Expose()
  address?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  @Expose()
  email?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  @Expose()
  logo?: string;
}

export class SupplierListDto {
  @ApiProperty({ type: [SupplierDto] })
  items: SupplierDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;
}

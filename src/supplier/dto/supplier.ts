import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

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
  zipcode?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  @Expose()
  roadAddress?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  @Expose()
  roadAddressReference?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  @Expose()
  @Transform(({ obj }) => {
    const road = obj.roadAddress || '';
    const detail = obj.detailAddress ? `, ${obj.detailAddress}` : '';

    // ⭐️ 참조 주소가 존재할 때만 괄호를 감싸고, 없으면 빈 문자열 처리
    const roadReference = obj.roadAddressReference
      ? ` (${obj.roadAddressReference.trim()})`
      : '';

    const combined = `${road}${detail}${roadReference}`.trim();

    return combined === '' ? null : combined;
  })
  address?: string | null;

  @ApiProperty()
  @IsString()
  @IsOptional()
  @Expose()
  detailAddress?: string;

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
  @Expose() // Expose 추가
  @Type(() => SupplierDto) // 이 부분이 없으면 내부 객체가 plain object로 남습니다
  items: SupplierDto[];

  @ApiProperty()
  @Expose()
  total: number;

  @ApiProperty()
  @Expose()
  page: number;

  @ApiProperty()
  @Expose()
  limit: number;
}

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
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiProperty()
  @Expose()
  number: string;

  @ApiProperty()
  @Expose()
  phone?: string;

  @ApiProperty()
  @Expose()
  zipcode?: string;

  @ApiProperty()
  @Expose()
  roadAddress?: string;

  @ApiProperty()
  @Expose()
  roadAddressReference?: string;

  @ApiProperty()
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
  @Expose()
  detailAddress?: string;

  @ApiProperty()
  @Expose()
  email?: string;

  @ApiProperty()
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

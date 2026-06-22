import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

export class AddressDto {
  @ApiProperty()
  @Expose()
  zipNo: string;

  @ApiProperty()
  @Expose()
  roadAddr: string;

  @ApiProperty()
  @Expose()
  roadAddrPart1: string;

  @ApiProperty()
  @Expose()
  emdNm: string;

  @ApiProperty()
  @Expose()
  bdNm: string;

  @ApiProperty()
  @Expose()
  jibunAddr: string;
}

export class AddressListDto {
  @ApiProperty({ type: [AddressDto] })
  @ValidateNested({ each: true })
  @Type(() => AddressDto)
  @Expose()
  items: AddressDto[];

  @ApiProperty()
  @Expose()
  page: number;

  @ApiProperty()
  @Expose()
  total: number;
}

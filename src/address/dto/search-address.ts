import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsInt, IsOptional } from 'class-validator';

export class SearchAddressDto {
  @ApiProperty()
  @IsInt()
  @Type(() => Number)
  page: number;

  @ApiProperty()
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  limit: number = 10;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  search: string;
}

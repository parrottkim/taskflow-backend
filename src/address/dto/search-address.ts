import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsInt, IsOptional } from 'class-validator';

export class SearchAddressDto {
  @ApiProperty()
  @IsInt()
  @Type(() => Number)
  currentPage: number;

  @ApiProperty()
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  countPerPage: number = 10;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  keyword: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  resultType: string = 'json';

  @ApiProperty()
  @IsString()
  @IsOptional()
  hstryYn: string = 'N';

  @ApiProperty()
  @IsString()
  @IsOptional()
  firstSort: string = 'road';

  @ApiProperty()
  @IsString()
  @IsOptional()
  addInfoYn: string = 'Y';
}

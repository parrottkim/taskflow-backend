import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString } from 'class-validator';
import { IssueCategoryChargeDto } from './issue-category-charge';

export class IssueCategoryDto {
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
  @ApiProperty({ type: IssueCategoryChargeDto })
  @Type(() => IssueCategoryChargeDto)
  @Expose()
  charge: IssueCategoryChargeDto;
}

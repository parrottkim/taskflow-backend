import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class TripStepDto {
  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  @Expose()
  id: number;

  @ApiProperty()
  @Transform(({ obj }) => obj.category?.id)
  @Expose()
  categoryId: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Expose()
  name: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  @Expose()
  description?: string;

  @ApiProperty()
  @IsBoolean()
  @IsNotEmpty()
  @Expose()
  requiresExpenseCurrency: boolean;
}

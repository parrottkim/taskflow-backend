import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, IsNotEmpty, IsInt, IsOptional } from 'class-validator';

export class CreateScheduleDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  summary: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  projectId: number;

  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  categoryId: number;

  @ApiProperty()
  @Transform(({ value }) => {
    if (!value) return value;
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  })
  @IsString()
  @IsNotEmpty()
  start: string;

  @ApiProperty()
  @Transform(({ value }) => {
    if (!value) return value;
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;

    d.setDate(d.getDate() + 1);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  })
  @IsString()
  @IsNotEmpty()
  end: string;
}

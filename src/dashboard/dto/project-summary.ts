import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty } from 'class-validator';

export class ProjectSummaryDto {
  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  total: number;

  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  closed: number;

  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  preexecuted: number;

  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  active: number;
}

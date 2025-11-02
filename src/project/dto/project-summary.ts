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
  finished: number;

  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  kickedOff: number;

  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  active: number;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class ProjectItemCountDto {
  @ApiProperty()
  @IsNumber()
  contracts: number;

  @ApiProperty()
  @IsNumber()
  declarations: number;

  @ApiProperty()
  @IsNumber()
  procurements: number;

  @ApiProperty()
  @IsNumber()
  reports: number;
}

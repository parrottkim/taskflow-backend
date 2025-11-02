import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class GetProjectSummaryDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  start?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  end?: string;
}

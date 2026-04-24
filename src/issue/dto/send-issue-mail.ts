import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsArray, IsInt } from 'class-validator';

export class SendIssueMailDto {
  @ApiProperty()
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  userIds?: number[];
}

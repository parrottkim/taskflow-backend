import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsInt, IsBoolean, IsOptional, IsString } from 'class-validator';
import { CreateProjectDto } from './create-project';

export class UpdateProjectDto extends PartialType(CreateProjectDto) {
  @ApiProperty()
  @IsInt()
  @IsOptional()
  categoryId?: number;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  isContracted?: boolean;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  isClosed?: boolean;

  @ApiProperty()
  @IsString()
  @IsOptional()
  closureMessage?: string;
}

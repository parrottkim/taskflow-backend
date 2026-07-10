import { ApiProperty } from '@nestjs/swagger';
import { Type, Expose } from 'class-transformer';
import { IsString, IsNotEmpty, IsInt, IsOptional } from 'class-validator';

export class CreateProjectClientDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ name: 'parent_id' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  @Expose({ name: 'parent_id' })
  parentId?: number;
}

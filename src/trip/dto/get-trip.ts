import { ApiProperty } from '@nestjs/swagger';
import { Type, Expose } from 'class-transformer';
import { IsInt, Min, IsOptional, IsNotEmpty } from 'class-validator';

export class GetTripDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(10)
  @IsOptional()
  limit?: number = 10;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  @Expose({ name: 'project_id' })
  projectId: number;
}

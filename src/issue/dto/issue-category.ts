import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class IssueCategoryDto {
  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  @Expose()
  id: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Expose()
  name: string;

  @Transform(({ obj }) => {
    switch (obj.id) {
      case 1:
        return 'contract';
      case 2:
        return 'kickoff';
      case 3:
        return 'approval';
      case 4:
        return 'procurement';
      case 5:
        return 'transaction';
      case 6:
        return 'payment';
      default:
        return 'unknown';
    }
  })
  @Expose()
  type: string;
}

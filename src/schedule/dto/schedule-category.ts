import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class ScheduleCategoryDto {
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

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Expose()
  color: string;

  @Transform(({ obj }) => {
    switch (obj.id) {
      case 1:
        return 'domestic';
      case 2:
        return 'overseas';
      case 3:
        return 'center';
      case 4:
        return 'remote';
      case 5:
        return 'conference';
    }
  })
  @Expose()
  type: string;
}

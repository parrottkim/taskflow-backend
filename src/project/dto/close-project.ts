import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CloseProjectDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  closureMessage: string;
}

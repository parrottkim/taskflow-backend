import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, ValidateNested } from 'class-validator';
import { PositionDto } from './position';
import { DepartmentDto } from './department';
import { Expose, Type } from 'class-transformer';

export class UserDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  email: string;

  @ApiProperty()
  @Expose()
  username: string;

  @ApiProperty()
  @Expose()
  profile: Buffer;

  @ApiProperty()
  @Expose()
  isAdmin: boolean;

  @ApiProperty()
  @Expose()
  isAuthorized: boolean;

  @ApiProperty({ type: PositionDto })
  @Expose()
  @Type(() => PositionDto)
  position: PositionDto;

  @ApiProperty({ type: DepartmentDto })
  @Expose()
  @Type(() => DepartmentDto)
  department: DepartmentDto;
}

export class UserListDto {
  @ApiProperty({ type: [UserDto] })
  @ValidateNested({ each: true })
  @Type(() => UserDto)
  items: UserDto[];

  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  page: number;

  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  total: number;
}

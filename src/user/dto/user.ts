import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, ValidateNested } from 'class-validator';
import { PositionDto } from './position';
import { RankDto } from './rank';
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

  @ApiProperty()
  @Expose()
  isGuest: boolean;

  @ApiProperty({ type: RankDto })
  @Type(() => RankDto)
  @Expose()
  rank: RankDto;

  @ApiProperty({ type: PositionDto, nullable: true, required: false })
  @Type(() => PositionDto)
  @Expose()
  position?: PositionDto | null;

  @ApiProperty({ type: DepartmentDto })
  @Type(() => DepartmentDto)
  @Expose()
  department: DepartmentDto;
}

export class UserListDto {
  @ApiProperty({ type: [UserDto] })
  @ValidateNested({ each: true })
  @Type(() => UserDto)
  @Expose()
  items: UserDto[];

  @ApiProperty()
  @Expose()
  page: number;

  @ApiProperty()
  @Expose()
  total: number;
}

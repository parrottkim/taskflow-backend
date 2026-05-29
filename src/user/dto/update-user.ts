import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user';
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsNumber, IsString } from 'class-validator';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiProperty()
  @IsString()
  @IsOptional()
  refreshToken?: string;
}

export class UpdateUserPermissionDto {
  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  isAdmin?: boolean;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  isAuthorized?: boolean;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  positionId?: number;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  departmentId?: number;
}

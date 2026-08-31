import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsNumber, IsString } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  username?: string;
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
  @IsBoolean()
  @IsOptional()
  isGuest?: boolean;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  rankId?: number;

  @ApiProperty({ nullable: true, required: false })
  @IsNumber()
  @IsOptional()
  positionId?: number | null;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  departmentId?: number;
}

import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsInt,
  IsNotEmpty,
  ValidateNested,
} from 'class-validator';
import { UserDto } from 'src/user/dto/user';
import {
  TripActualExpenseDto,
  TripFuelExpenseDto,
  TripRegulationRateDto,
} from './trip-expense';
import { ScheduleDto } from 'src/schedule/dto/schedule';

export class TripDto {
  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  @Expose()
  id: number;

  @ApiProperty({ type: ScheduleDto })
  @Type(() => ScheduleDto)
  @Expose()
  schedule: ScheduleDto;

  @ApiProperty({ type: UserDto })
  @Type(() => UserDto)
  @Expose()
  user: UserDto;

  @ApiProperty({ type: [TripActualExpenseDto] })
  @ValidateNested({ each: true })
  @Type(() => TripActualExpenseDto)
  @Expose()
  expenses: TripActualExpenseDto[];

  @ApiProperty({ type: [TripRegulationRateDto] })
  @ValidateNested({ each: true })
  @Type(() => TripRegulationRateDto)
  @Expose()
  rates: TripRegulationRateDto[];

  @ApiProperty({ type: TripFuelExpenseDto })
  @Type(() => TripFuelExpenseDto)
  @Expose()
  fuel: TripFuelExpenseDto;

  @ApiProperty()
  @IsBoolean()
  @IsNotEmpty()
  @Expose()
  isDeducted: boolean;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  @Expose()
  createdAt: Date;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  @Expose()
  updatedAt: Date;

  @ApiProperty({ required: false, nullable: true })
  @Type(() => Date)
  @IsDate()
  @Expose()
  deletedAt: Date | null;
}

export class TripListDto {
  @ApiProperty({ type: [TripDto] })
  @ValidateNested({ each: true })
  @Type(() => TripDto)
  @Expose()
  items: TripDto[];

  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  @Expose()
  page: number;

  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  @Expose()
  total: number;
}

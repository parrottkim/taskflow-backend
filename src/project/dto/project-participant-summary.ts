import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { KickoffIssueParticipantItemDto } from '@/issue/dto/issue';
import { UserDto } from '@/user/dto/user';

export class ProjectParticipantSummaryDto {
  @ApiProperty({ type: UserDto, nullable: true })
  @Type(() => UserDto)
  @Expose()
  manager: UserDto | null;

  @ApiProperty({ type: [KickoffIssueParticipantItemDto] })
  @ValidateNested({ each: true })
  @Type(() => KickoffIssueParticipantItemDto)
  @Expose()
  participants: KickoffIssueParticipantItemDto[];
}

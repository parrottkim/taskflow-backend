import { ApiProperty } from '@nestjs/swagger';
import { Expose, plainToInstance, Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsInt,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from 'class-validator';
import { IssueCategoryDto } from './issue-category';
import { UserDto } from 'src/user/dto/user';
import {
  ApprovalIssueDetailsDto,
  ContractIssueDetailsDto,
  DeclarationIssueDetailsDto,
  KickoffIssueDetailsDto,
  PaymentIssueDetailsDto,
  ProcurementIssueDetailsDto,
  TransactionIssueDetailsDto,
} from './issue-details';
import { IssueAttachmentDto } from './issue-attachment';

export class IssueDto {
  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  @Expose()
  id: number;

  @ApiProperty({ type: IssueCategoryDto })
  @Type(() => IssueCategoryDto)
  @Expose()
  category: IssueCategoryDto;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Expose()
  content: string;

  @ApiProperty()
  @Transform(({ obj }) => {
    switch (
      obj.category.id // category의 이름(예: '계약')을 기준으로 분기
    ) {
      case 1:
        return plainToInstance(
          ContractIssueDetailsDto,
          {
            type: 'contract',
            ...obj.contract,
          },
          {
            excludeExtraneousValues: true,
          },
        );
      case 2:
        return plainToInstance(
          KickoffIssueDetailsDto,
          {
            type: 'kickoff',
            ...obj.kickoff,
          },
          {
            excludeExtraneousValues: true,
          },
        );
      case 3:
        return plainToInstance(
          ApprovalIssueDetailsDto,
          {
            type: 'approval',
            ...obj.approval,
          },
          {
            excludeExtraneousValues: true,
          },
        );
      case 4:
        return plainToInstance(
          ProcurementIssueDetailsDto,
          {
            type: 'procurement',
            ...obj.procurement,
          },
          {
            excludeExtraneousValues: true,
          },
        );
      case 5:
        return plainToInstance(
          TransactionIssueDetailsDto,
          {
            type: 'transaction',
            ...obj.transaction,
          },
          {
            excludeExtraneousValues: true,
          },
        );
      case 6:
        return plainToInstance(
          DeclarationIssueDetailsDto,
          {
            type: 'declaration',
            ...obj.declaration,
          },
          {
            excludeExtraneousValues: true,
          },
        );
      case 7:
        return plainToInstance(
          PaymentIssueDetailsDto,
          {
            type: 'payment',
            ...obj.payment,
          },
          {
            excludeExtraneousValues: true,
          },
        );
    }
  })
  @Expose()
  details:
    | ContractIssueDetailsDto
    | KickoffIssueDetailsDto
    | ApprovalIssueDetailsDto
    | ProcurementIssueDetailsDto
    | TransactionIssueDetailsDto
    | DeclarationIssueDetailsDto
    | PaymentIssueDetailsDto;

  @ApiProperty({ type: [IssueAttachmentDto] })
  @ValidateNested({ each: true })
  @Type(() => IssueAttachmentDto)
  @Expose()
  attachments: IssueAttachmentDto[];

  @ApiProperty({ type: UserDto })
  @Type(() => UserDto)
  @Expose()
  user: UserDto;

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

export class IssueListDto {
  @ApiProperty({ type: [IssueDto] })
  @ValidateNested({ each: true })
  @Type(() => IssueDto)
  @Expose()
  items: IssueDto[];

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

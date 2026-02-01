import { TypeOrmModule } from '@nestjs/typeorm';
import { Currency } from 'src/entity/currency/currency.entity';
import { ContractIssueItem } from 'src/entity/issue/contract/contract-issue-item.entity';
import { IssueAttachment } from 'src/entity/issue/issue-attachment.entity';
import { IssueCategory } from 'src/entity/issue/issue-category.entity';
import { Issue } from 'src/entity/issue/issue.entity';
import { ContractIssue } from 'src/entity/issue/contract/contract-issue.entity';
import { KickoffIssue } from 'src/entity/issue/kickoff/kickoff-issue.entity';
import { ProcurementIssue } from 'src/entity/issue/procurement/procurement-issue.entity';
import { TransactionIssue } from 'src/entity/issue/transaction/transaction-issue.entity';
import { ProcurementIssueItem } from 'src/entity/issue/procurement/procurement-issue-item.entity';
import { TransactionIssueItemCategory } from 'src/entity/issue/transaction/transaction-issue-category.entity';
import { TransactionIssueItem } from 'src/entity/issue/transaction/transaction-issue-item.entity';
import { SftpModule } from 'src/sftp/sftp.module';
import { IssueAttachmentController } from './issue-attachment.controller';
import { IssueAttachmentService } from './issue-attachment.service';
import { IssueController } from './issue.controller';
import { IssueService } from './issue.service';
import { Module } from '@nestjs/common';
import { MailModule } from 'src/mail/mail.module';
import { ProjectClientModule } from 'src/project/project-client.module';
import { PaymentIssue } from 'src/entity/issue/payment/payment-issue.entity';
import { ApprovalIssue } from 'src/entity/issue/approval/approval-issue.entity';
import { Supplier } from 'src/entity/supplier/supplier.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Issue,
      ContractIssueItem,
      TransactionIssueItem,
      TransactionIssueItemCategory,
      KickoffIssue,
      ContractIssue,
      TransactionIssue,
      PaymentIssue,
      ApprovalIssue,
      ProcurementIssue,
      ProcurementIssueItem,
      IssueCategory,
      IssueAttachment,
      Currency,
      Supplier,
    ]),
    ProjectClientModule,
    MailModule,
    SftpModule,
  ],
  providers: [IssueService, IssueAttachmentService],
  controllers: [IssueController, IssueAttachmentController],
  exports: [IssueService, IssueAttachmentService],
})
export class IssueModule {}

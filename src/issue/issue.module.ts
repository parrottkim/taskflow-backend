import { TypeOrmModule } from '@nestjs/typeorm';
import { Currency } from '@/entity/currency/currency.entity';
import { ContractIssueItem } from '@/entity/issue/contract/contract-issue-item.entity';
import { IssueAttachment } from '@/entity/issue/issue-attachment.entity';
import { IssueCategory } from '@/entity/issue/issue-category.entity';
import { Issue } from '@/entity/issue/issue.entity';
import { ContractIssue } from '@/entity/issue/contract/contract-issue.entity';
import { KickoffIssue } from '@/entity/issue/kickoff/kickoff-issue.entity';
import { ProcurementIssue } from '@/entity/issue/procurement/procurement-issue.entity';
import { TransactionIssue } from '@/entity/issue/transaction/transaction-issue.entity';
import { ProcurementIssueItem } from '@/entity/issue/procurement/procurement-issue-item.entity';
import { TransactionIssueItemCategory } from '@/entity/issue/transaction/transaction-issue-category.entity';
import { TransactionIssueItem } from '@/entity/issue/transaction/transaction-issue-item.entity';
import { SftpModule } from '@/sftp/sftp.module';
import { IssueController } from './issue.controller';
import { IssueService } from './issue.service';
import { Module } from '@nestjs/common';
import { MailModule } from '@/mail/mail.module';
import { ProjectClientModule } from '@/project/project-client.module';
import { PaymentIssue } from '@/entity/issue/payment/payment-issue.entity';
import { ApprovalIssue } from '@/entity/issue/approval/approval-issue.entity';
import { Supplier } from '@/entity/supplier/supplier.entity';
import { ProcurementIssueRequestItem } from '@/entity/issue/procurement/procurement-issue-request-item.entity';
import { ProcurementIssueRequest } from '@/entity/issue/procurement/procurement-issue-request.entity';
import { IssueEditGuard } from '@/common/guards/issue-edit.guard';
import { IssueProcurementRequestGuard } from '@/common/guards/issue-procurement-request.guard';
import { ApprovalIssueController } from './approval/approval-issue.controller';
import { ApprovalIssueService } from './approval/approval-issue.service';
import { ContractIssueController } from './contract/contract-issue.controller';
import { ContractIssueService } from './contract/contract-issue.service';
import { KickoffIssueController } from './kickoff/kickoff-issue.controller';
import { KickoffIssueService } from './kickoff/kickoff-issue.service';
import { PaymentIssueController } from './payment/payment-issue.controller';
import { PaymentIssueService } from './payment/payment-issue.service';
import { ProcurementIssueController } from './procurement/procurement-issue.controller';
import { ProcurementIssueExportService } from './procurement/procurement-issue-export.service';
import { ProcurementIssueService } from './procurement/procurement-issue.service';
import { TransactionIssueController } from './transaction/transaction-issue.controller';
import { TransactionIssueService } from './transaction/transaction-issue.service';

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
      ProcurementIssueRequest,
      ProcurementIssueRequestItem,
      IssueCategory,
      IssueAttachment,
      Currency,
      Supplier,
    ]),
    ProjectClientModule,
    MailModule,
    SftpModule,
  ],
  // Keep IssueController last because its /issue/:id routes are catch-all routes.
  controllers: [
    ApprovalIssueController,
    ContractIssueController,
    KickoffIssueController,
    PaymentIssueController,
    ProcurementIssueController,
    TransactionIssueController,
    IssueController,
  ],
  providers: [
    IssueService,
    ApprovalIssueService,
    ContractIssueService,
    ProcurementIssueExportService,
    KickoffIssueService,
    PaymentIssueService,
    ProcurementIssueService,
    TransactionIssueService,
    IssueEditGuard,
    IssueProcurementRequestGuard,
  ],
})
export class IssueModule {}

import { Module } from '@nestjs/common';
import { IssueService } from './issue.service';
import { IssueController } from './issue.controller';
import { IssueCategory } from 'src/entity/issue/issue-category.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Issue } from 'src/entity/issue/issue.entity';
import { IssueCategoryCharge } from 'src/entity/issue/issue-category-charge.entity';
import { ProjectModule } from 'src/project/project.module';
import { ProjectClientModule } from 'src/project/project-client.module';
import { SftpModule } from 'src/sftp/sftp.module';
import { ApprovalIssue } from 'src/entity/issue/approval/approval-issue.entity';
import { ContractIssue } from 'src/entity/issue/contract/contract-issue.entity';
import { ContractIssueItem } from 'src/entity/issue/contract/contract-issue-item.entity';
import { KickoffIssue } from 'src/entity/issue/kickoff/kickoff-issue.entity';
import { ProcurementIssue } from 'src/entity/issue/procurement/procurement-issue.entity';
import { ProcurementIssueItem } from 'src/entity/issue/procurement/procurement-issue-item.entity';
import { DeclarationIssue } from 'src/entity/issue/declaration/declaration-issue.entity';
import { PaymentIssue } from 'src/entity/issue/payment/payment-issue.entity';
import { TransactionIssue } from 'src/entity/issue/transaction/transaction-issue.entity';
import { TransactionIssueItem } from 'src/entity/issue/transaction/transaction-issue-item.entity';
import { TransactionIssueItemCategory } from 'src/entity/issue/transaction/transaction-issue-category.entity';
import { IssueAttachment } from 'src/entity/issue/issue-attachment.entity';
import { IssueAttachmentSubscriber } from 'src/common/subscribers/issue-attachment.subscriber';
import { SupplierModule } from 'src/supplier/supplier.module';
import { Supplier } from 'src/entity/supplier/supplier.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Issue,
      IssueCategory,
      IssueCategoryCharge,
      ApprovalIssue,
      ContractIssue,
      ContractIssueItem,
      DeclarationIssue,
      KickoffIssue,
      PaymentIssue,
      ProcurementIssue,
      ProcurementIssueItem,
      Supplier,
      TransactionIssue,
      TransactionIssueItem,
      TransactionIssueItemCategory,
      IssueAttachment,
    ]),
    ProjectModule,
    ProjectClientModule,
    SftpModule,
    SupplierModule,
  ],
  providers: [IssueService, IssueAttachmentSubscriber],
  controllers: [IssueController],
  exports: [IssueService],
})
export class IssueModule {}

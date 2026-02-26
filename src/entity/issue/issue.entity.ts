import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  OneToMany,
  OneToOne,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { User } from '../user/user.entity';
import { IssueAttachment } from './issue-attachment.entity';
import { IssueCategory } from './issue-category.entity';
import { ProcurementIssue } from './procurement/procurement-issue.entity';
import { KickoffIssue } from './kickoff/kickoff-issue.entity';
import { ContractIssue } from './contract/contract-issue.entity';
import { TransactionIssue } from './transaction/transaction-issue.entity';
import { PaymentIssue } from './payment/payment-issue.entity';

import { ApprovalIssue } from './approval/approval-issue.entity';
import { Project } from '../project/project.entity';

@Entity()
export class Issue {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Project, (project) => project.issues, {
    onDelete: 'CASCADE',
  })
  project: Project;

  @ManyToOne(() => IssueCategory, (category) => category.issues)
  category: IssueCategory;

  @ManyToOne(() => User, (user) => user.issues)
  user: User;

  @Column({ type: 'text' })
  content: string;

  @OneToMany(() => IssueAttachment, (attachment) => attachment.issue, {
    cascade: true,
    orphanedRowAction: 'delete',
  })
  attachments: IssueAttachment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  @OneToOne(() => KickoffIssue, (detail) => detail.issue)
  kickoff?: KickoffIssue;

  @OneToOne(() => ContractIssue, (contract) => contract.issue)
  contract?: ContractIssue;

  @OneToOne(() => TransactionIssue, (transaction) => transaction.issue)
  transaction?: TransactionIssue;

  @OneToOne(() => PaymentIssue, (payment) => payment.issue)
  payment?: PaymentIssue;

  @OneToOne(() => ApprovalIssue, (approval) => approval.issue)
  approval?: ApprovalIssue;

  @OneToOne(() => ProcurementIssue, (procurement) => procurement.issue)
  procurement?: ProcurementIssue;
}

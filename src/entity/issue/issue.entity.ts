import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Project } from '../project/project.entity';
import { IssueCategory } from './issue-category.entity';
import { User } from '../user/user.entity';
import { ContractIssue } from './contract/contract-issue.entity';
import { IssueAttachment } from './issue-attachment.entity';
import { KickoffIssue } from './kickoff/kickoff-issue.entity';
import { ApprovalIssue } from './approval/approval-issue.entity';
import { ProcurementIssue } from './procurement/procurement-issue.entity';
import { TransactionIssue } from './transaction/transaction-issue.entity';
import { DeclarationIssue } from './declaration/declaration-issue.entity';
import { PaymentIssue } from './payment/payment-issue.entity';

@Entity()
export class Issue {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Project, (project) => project.issues)
  project: Project;

  @ManyToOne(() => IssueCategory, (category) => category.issues)
  category: IssueCategory;

  @ManyToOne(() => User, (user) => user.issues)
  user: User;

  @Column({ type: 'text' }) // 마크다운 본문은 text 타입
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
  deletedAt!: Date | null;

  @OneToOne(() => ContractIssue, (contract) => contract.issue, {
    cascade: true,
  })
  contract?: ContractIssue;

  @OneToOne(() => KickoffIssue, (kickoff) => kickoff.issue, { cascade: true })
  kickoff?: KickoffIssue;

  @OneToOne(() => ApprovalIssue, (approval) => approval.issue, {
    cascade: true,
  })
  approval?: ApprovalIssue;

  @OneToOne(() => ProcurementIssue, (procurement) => procurement.issue, {
    cascade: true,
  })
  procurement?: ProcurementIssue;

  @OneToOne(() => TransactionIssue, (transaction) => transaction.issue, {
    cascade: true,
  })
  transaction?: TransactionIssue;

  @OneToOne(() => DeclarationIssue, (declaration) => declaration.issue, {
    cascade: true,
  })
  declaration?: DeclarationIssue;

  @OneToOne(() => PaymentIssue, (payment) => payment.issue, {
    cascade: true,
  })
  payment?: PaymentIssue;
}

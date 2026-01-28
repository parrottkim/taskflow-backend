import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Column,
  OneToMany,
  OneToOne,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { User } from '../user/user.entity';
import { ContractIssueItem } from './contract/contract-issue-item.entity';
import { IssueAttachment } from './issue-attachment.entity';
import { IssueCategory } from './issue-category.entity';
import { TransactionIssueItem } from './transaction/transaction-issue-item.entity';
import { ProcurementIssue } from './procurement/procurement-issue.entity';
import { KickoffIssue } from './kickoff/kickoff-issue.entity';
import { ContractIssue } from './contract/contract-issue.entity';
import { TransactionIssue } from './transaction/transaction-issue.entity';
import { PaymentIssue } from './payment/payment-issue.entity';
import { Currency } from '../currency/currency.entity';
import { DeclarationIssue } from './declaration/declaration-issue.entity';
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

  @ManyToOne(() => Currency, (currency) => currency.issues)
  currency: Currency;

  @OneToOne(() => KickoffIssue, (detail) => detail.issue)
  kickoff?: KickoffIssue;

  @OneToOne(() => ContractIssue, (contract) => contract.issue)
  contract?: ContractIssue;

  @OneToOne(() => TransactionIssue, (transaction) => transaction.issue)
  transaction?: TransactionIssue;

  @OneToOne(() => PaymentIssue, (payment) => payment.issue)
  payment?: PaymentIssue;

  @OneToOne(() => DeclarationIssue, (declaration) => declaration.issue)
  declaration?: DeclarationIssue;

  @OneToOne(() => ProcurementIssue, (procurement) => procurement.issue)
  procurement?: ProcurementIssue;
}

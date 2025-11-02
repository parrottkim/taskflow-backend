import {
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Issue } from '../issue.entity';
import { TransactionIssueItem } from './transaction-issue-item.entity';

@Entity()
export class TransactionIssue {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Issue, (issue) => issue.transaction)
  @JoinColumn()
  issue: Issue;

  @OneToMany(() => TransactionIssueItem, (item) => item.transaction, {
    cascade: true,
    orphanedRowAction: 'delete',
  })
  items: TransactionIssueItem[];
}

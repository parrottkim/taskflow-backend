import {
  Entity,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Issue } from '../issue.entity';
import { ContractIssueItem } from './contract-issue-item.entity';

@Entity()
export class ContractIssue {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Issue, (issue) => issue.contract)
  @JoinColumn()
  issue: Issue;

  @OneToMany(() => ContractIssueItem, (item) => item.contract, {
    cascade: true,
    orphanedRowAction: 'delete',
  })
  items: ContractIssueItem[];
}

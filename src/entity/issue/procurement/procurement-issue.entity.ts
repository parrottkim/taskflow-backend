import {
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Issue } from '../issue.entity';
import { ProcurementIssueItem } from './procurement-issue-item.entity';

@Entity()
export class ProcurementIssue {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Issue, (issue) => issue.procurement)
  @JoinColumn()
  issue: Issue;

  @OneToMany(() => ProcurementIssueItem, (item) => item.procurement, {
    cascade: true,
    orphanedRowAction: 'delete',
  })
  items: ProcurementIssueItem[];
}

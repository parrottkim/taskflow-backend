import { Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Issue } from '../issue.entity';

@Entity()
export class ApprovalIssue {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Issue, (issue) => issue.approval)
  @JoinColumn()
  issue: Issue;
}

import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Issue } from '../issue.entity';

@Entity()
export class KickoffIssue {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Issue, (issue) => issue.kickoff)
  @JoinColumn()
  issue: Issue;

  @Column({ type: 'date' })
  kickoffDate: Date;
}

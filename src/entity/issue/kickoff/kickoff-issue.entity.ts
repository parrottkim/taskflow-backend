import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
  ManyToOne,
} from 'typeorm';
import { Issue } from '../issue.entity';
import { Project } from '@/entity/project/project.entity';
import { KickoffIssueTripItem } from './kickoff-issue-trip-item.entity';
import { KickoffIssueParticipantItem } from './kickoff-issue-participant-item.entity';

@Entity()
@Index(['project'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class KickoffIssue {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Issue, (issue) => issue.kickoff)
  @JoinColumn()
  issue: Issue;

  @ManyToOne(() => Project, (project) => project.kickoffs)
  @JoinColumn()
  project: Project;

  @OneToMany(() => KickoffIssueParticipantItem, (item) => item.kickoff)
  participantItems: KickoffIssueParticipantItem[];

  @OneToMany(() => KickoffIssueTripItem, (item) => item.kickoff)
  tripItems: KickoffIssueTripItem[];

  @Column({ type: 'date' })
  kickoffDate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}

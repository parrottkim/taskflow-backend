import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Issue } from '../issue.entity';
import { Project } from 'src/entity/project/project.entity';

@Entity()
export class KickoffIssue {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Issue, (issue) => issue.kickoff)
  @JoinColumn()
  issue: Issue;

  @ManyToOne(() => Project, (project) => project.kickoff)
  @JoinColumn()
  project: Project;

  @Column({ type: 'date' })
  kickoffDate: Date;
}

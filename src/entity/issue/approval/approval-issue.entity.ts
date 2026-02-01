import { Project } from 'src/entity/project/project.entity';
import {
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Issue } from '../issue.entity';

@Entity()
export class ApprovalIssue {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Issue, (issue) => issue.approval)
  @JoinColumn()
  issue: Issue;

  @ManyToOne(() => Project, (project) => project.approvals)
  @JoinColumn()
  project: Project;
}

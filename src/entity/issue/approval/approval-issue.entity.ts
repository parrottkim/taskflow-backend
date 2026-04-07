import { Project } from '@/entity/project/project.entity';
import {
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}

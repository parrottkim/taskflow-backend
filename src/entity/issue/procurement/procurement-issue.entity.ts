import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProcurementIssueItem } from './procurement-issue-item.entity';
import { Issue } from 'src/entity/issue/issue.entity';
import { Project } from 'src/entity/project/project.entity';

@Entity()
export class ProcurementIssue {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Issue, (issue) => issue.procurement)
  @JoinColumn()
  issue: Issue;

  @ManyToOne(() => Project, (project) => project.procurements)
  @JoinColumn()
  project: Project;

  @OneToMany(() => ProcurementIssueItem, (item) => item.procurement, {
    cascade: true,
    orphanedRowAction: 'delete',
  })
  items: ProcurementIssueItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}

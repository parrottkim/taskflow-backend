import {
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
} from 'typeorm';
import { Issue } from '@/entity/issue/issue.entity';
import { Project } from '@/entity/project/project.entity';

@Entity()
@Index(['project'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class TransactionIssue {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Issue, (issue) => issue.transaction)
  @JoinColumn()
  issue: Issue;

  @ManyToOne(() => Project, (project) => project.transactions)
  @JoinColumn()
  project: Project;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}

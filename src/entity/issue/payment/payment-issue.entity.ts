import { Issue } from '@/entity/issue/issue.entity';
import { Project } from '@/entity/project/project.entity';
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

@Entity()
@Index(['project'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class PaymentIssue {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Issue, (issue) => issue.payment)
  @JoinColumn()
  issue: Issue;

  @ManyToOne(() => Project, (project) => project.payments)
  @JoinColumn()
  project: Project;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}

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
import { Project } from 'src/entity/project/project.entity';

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

  @Column({ type: 'date' })
  kickoffDate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}

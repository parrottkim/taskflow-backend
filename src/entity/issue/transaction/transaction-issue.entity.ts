import { Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Issue } from 'src/entity/issue/issue.entity';
import { Project } from 'src/entity/project/project.entity';

@Entity()
export class TransactionIssue {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Issue, (issue) => issue.transaction)
  @JoinColumn()
  issue: Issue;

  @OneToOne(() => Project, (project) => project.transaction)
  @JoinColumn()
  project: Project;
}

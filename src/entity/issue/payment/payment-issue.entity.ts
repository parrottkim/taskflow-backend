import { Issue } from 'src/entity/issue/issue.entity';
import { Project } from 'src/entity/project/project.entity';
import {
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class PaymentIssue {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Issue, (issue) => issue.payment)
  @JoinColumn()
  issue: Issue;

  @ManyToOne(() => Project, (project) => project.payment)
  @JoinColumn()
  project: Project;
}

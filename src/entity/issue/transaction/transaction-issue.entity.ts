import {
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Issue } from 'src/entity/issue/issue.entity';
import { Project } from 'src/entity/project/project.entity';
import { Currency } from 'src/entity/currency/currency.entity';

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

  @ManyToOne(() => Currency)
  currency: Currency;
}

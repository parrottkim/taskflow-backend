import {
  Entity,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { Issue } from 'src/entity/issue/issue.entity';
import { Project } from 'src/entity/project/project.entity';
import { Currency } from 'src/entity/currency/currency.entity';

@Entity()
export class ContractIssue {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Issue, (issue) => issue.contract)
  @JoinColumn()
  issue: Issue;

  @OneToOne(() => Project, (project) => project.contract)
  @JoinColumn()
  project: Project;

  @ManyToOne(() => Currency)
  currency: Currency;
}

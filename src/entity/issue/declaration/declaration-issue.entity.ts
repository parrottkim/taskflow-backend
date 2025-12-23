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
export class DeclarationIssue {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Issue, (issue) => issue.declaration)
  @JoinColumn()
  issue: Issue;

  @ManyToOne(() => Project, (project) => project.declarations)
  @JoinColumn()
  project: Project;
}

import { Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Issue } from '../issue.entity';

@Entity()
export class DeclarationIssue {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Issue, (issue) => issue.declaration)
  @JoinColumn()
  issue: Issue;
}

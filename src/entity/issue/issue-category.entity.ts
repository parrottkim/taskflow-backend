import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Issue } from './issue.entity';

@Entity()
export class IssueCategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  name: string;

  @OneToMany(() => Issue, (issue) => issue.category)
  issues: Issue[];
}

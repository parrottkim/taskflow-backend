import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { IssueCategory } from './issue-category.entity';

@Entity()
export class IssueCategoryCharge {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  name: string;

  @OneToMany(() => IssueCategory, (issue) => issue.charge)
  categories: IssueCategory[];
}

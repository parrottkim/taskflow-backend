import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Issue } from './issue.entity';
import { IssueCategoryCharge } from './issue-category-charge.entity';

@Entity()
export class IssueCategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  name: string;

  @Column()
  sequence: number = 10;

  @OneToMany(() => Issue, (issue) => issue.category)
  issues: Issue[];

  @ManyToOne(() => IssueCategoryCharge, (charge) => charge.categories)
  charge: IssueCategoryCharge;
}

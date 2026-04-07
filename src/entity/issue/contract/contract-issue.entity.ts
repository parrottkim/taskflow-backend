import {
  Entity,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  ManyToOne,
} from 'typeorm';
import { Issue } from '@/entity/issue/issue.entity';
import { Project } from '@/entity/project/project.entity';
import { Currency } from '@/entity/currency/currency.entity';

@Entity()
@Index(['project'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class ContractIssue {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Issue, (issue) => issue.contract)
  @JoinColumn()
  issue: Issue;

  @ManyToOne(() => Project, (project) => project.contracts)
  @JoinColumn()
  project: Project;

  @ManyToOne(() => Currency, { nullable: true })
  currency?: Currency;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}

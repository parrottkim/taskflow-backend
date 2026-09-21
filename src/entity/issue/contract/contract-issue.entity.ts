import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Issue } from '@/entity/issue/issue.entity';
import { Project } from '@/entity/project/project.entity';
import { Currency } from '@/entity/currency/currency.entity';
import { ContractExchangeRate } from './contract-exchange-rate.entity';

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

  @OneToOne(() => ContractExchangeRate, (rate) => rate.contract, {
    cascade: true,
    orphanedRowAction: 'delete',
  })
  exchangeRate?: ContractExchangeRate;

  @Column({ type: 'date' })
  contractDate: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}

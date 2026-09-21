import { DecimalColumnTransformer } from '@/common/utils/transformer.utils';
import {
  Entity,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { ContractIssue } from './contract-issue.entity';

@Entity()
export class ContractExchangeRate {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => ContractIssue, (contract) => contract.exchangeRate, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'contract_id' })
  contract: ContractIssue;

  @Column('decimal', {
    precision: 10,
    scale: 4,
    transformer: new DecimalColumnTransformer(),
  })
  rate: number;

  @Column({ type: 'date' })
  appliedDate: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}

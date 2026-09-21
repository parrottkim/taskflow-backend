import { DecimalColumnTransformer } from '@/common/utils/transformer.utils';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ContractIssue } from './contract-issue.entity';

@Entity()
@Index('IDX_contract_exchange_rate_active_contract', ['contract'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
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

import {
  Entity,
  PrimaryColumn,
  Column,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TransactionIssueItem } from '../transaction/transaction-issue-item.entity';
import { ContractIssueItem } from '../contract/contract-issue-item.entity';

@Entity()
export class Currency {
  @PrimaryGeneratedColumn()
  id: number;

  // ISO 4217 표준 코드를 기본 키로 사용합니다. (예: 'USD', 'KRW')
  @Column({ type: 'varchar', length: 3 })
  code: string;

  @Column({ type: 'varchar' })
  symbol: string;

  @OneToMany(() => ContractIssueItem, (item) => item.currency)
  contracts: ContractIssueItem[];

  // 이 통화를 사용하는 거래 품목들을 참조합니다.
  @OneToMany(() => TransactionIssueItem, (item) => item.currency)
  transactions: TransactionIssueItem[];
}

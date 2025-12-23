import { Entity, Column, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { TransactionIssue } from '../issue/transaction/transaction-issue.entity';
import { Issue } from '../issue/issue.entity';

@Entity()
export class Currency {
  @PrimaryGeneratedColumn()
  id: number;

  // ISO 4217 표준 코드를 기본 키로 사용합니다. (예: 'USD', 'KRW')
  @Column({ type: 'varchar', length: 3 })
  code: string;

  @Column({ type: 'varchar' })
  symbol: string;
}

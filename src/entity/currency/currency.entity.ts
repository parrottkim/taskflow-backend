import { Entity, Column, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ContractIssue } from '../issue/contract/contract-issue.entity';

@Entity()
export class Currency {
  @PrimaryGeneratedColumn()
  id: number;

  // ISO 4217 표준 코드를 기본 키로 사용합니다. (예: 'USD', 'KRW')
  @Column({ type: 'varchar', length: 3 })
  code: string;

  @Column({ type: 'varchar' })
  symbol: string;

  @OneToMany(() => ContractIssue, (contract) => contract.currency)
  contracts: ContractIssue[];
}

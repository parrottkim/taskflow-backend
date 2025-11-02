import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { TransactionIssueItem } from './transaction-issue-item.entity';

@Entity()
export class TransactionIssueItemCategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @OneToMany(() => TransactionIssueItem, (item) => item.category)
  items: TransactionIssueItem[];
}

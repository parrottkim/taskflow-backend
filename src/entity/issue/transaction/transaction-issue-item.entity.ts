import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TransactionIssueItemCategory } from './transaction-issue-category.entity';
import { DecimalColumnTransformer } from 'src/common/utils/transformer.utils';
import { Issue } from '../issue.entity';

@Entity()
export class TransactionIssueItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Issue, (issue) => issue.transactionItems, {
    onDelete: 'CASCADE',
  })
  issue: Issue;

  @ManyToOne(() => TransactionIssueItemCategory, (category) => category.items)
  category: TransactionIssueItemCategory;

  @Column('decimal', {
    precision: 12,
    scale: 2,
    transformer: new DecimalColumnTransformer(),
  })
  price: number;

  @Column('decimal', {
    precision: 5,
    scale: 2,
    transformer: new DecimalColumnTransformer(),
  })
  ratio: number;

  @Column({ default: false, nullable: true })
  isPaid: boolean;

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date | null;

  @Column({ nullable: true })
  note: string;
}

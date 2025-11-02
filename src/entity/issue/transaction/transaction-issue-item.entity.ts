import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { TransactionIssue } from './transaction-issue.entity';
import { TransactionIssueItemCategory } from './transaction-issue-category.entity';
import { DecimalColumnTransformer } from 'src/common/utils/transformer.utils';

@Entity()
export class TransactionIssueItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => TransactionIssue, (issue) => issue.items)
  transaction: TransactionIssue;

  @ManyToOne(() => TransactionIssueItemCategory, (category) => category.items)
  category: TransactionIssueItemCategory;

  @Column('decimal', {
    precision: 12,
    scale: 2,
    transformer: new DecimalColumnTransformer(),
  })
  price: number;

  @Column()
  note: string;
}

import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ContractIssue } from './contract-issue.entity';
import { DecimalColumnTransformer } from 'src/common/utils/transformer.utils';

@Entity()
export class ContractIssueItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  item: string;

  @Column('decimal', {
    precision: 12,
    scale: 2,
    transformer: new DecimalColumnTransformer(),
  })
  price: number;

  @ManyToOne(() => ContractIssue, (issue) => issue.items)
  contract: ContractIssue;
}

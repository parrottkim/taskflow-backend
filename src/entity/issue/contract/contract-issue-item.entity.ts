import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DecimalColumnTransformer } from 'src/common/utils/transformer.utils';
import { Issue } from '../issue.entity';

@Entity()
export class ContractIssueItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Issue, (issue) => issue.contractItems, {
    onDelete: 'CASCADE',
  })
  issue: Issue;

  @Column()
  item: string;

  @Column('decimal', {
    precision: 12,
    scale: 2,
    transformer: new DecimalColumnTransformer(),
  })
  price: number;
}

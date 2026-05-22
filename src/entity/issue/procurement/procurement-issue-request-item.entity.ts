import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DecimalColumnTransformer } from '@/common/utils/transformer.utils';
import { ProcurementIssueRequest } from './procurement-issue-request.entity';

@Entity()
export class ProcurementIssueRequestItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  item: string;

  @Column()
  spec: string;

  @Column('decimal', {
    precision: 12,
    scale: 2,
    transformer: new DecimalColumnTransformer(),
  })
  quantity: number;

  @Column('decimal', {
    precision: 12,
    scale: 2,
    transformer: new DecimalColumnTransformer(),
  })
  unitPrice: number;

  @Column('decimal', {
    precision: 12,
    scale: 2,
    transformer: new DecimalColumnTransformer(),
  })
  totalAmount: number;

  @Column({ nullable: true })
  note: string;

  @ManyToOne(() => ProcurementIssueRequest, (request) => request.items)
  request: ProcurementIssueRequest;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}

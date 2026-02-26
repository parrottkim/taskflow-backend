import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DecimalColumnTransformer } from 'src/common/utils/transformer.utils';
import { Supplier } from 'src/entity/supplier/supplier.entity';
import { ProcurementIssue } from './procurement-issue.entity';

@Entity()
export class ProcurementIssueItem {
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

  @Column({ default: false })
  isOnlinePurchase: boolean;

  @Column({ nullable: true })
  purchaseUrl: string;

  @ManyToOne(() => Supplier, { nullable: true })
  supplier: Supplier;

  @ManyToOne(() => ProcurementIssue, (procurement) => procurement.items)
  procurement: ProcurementIssue;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}

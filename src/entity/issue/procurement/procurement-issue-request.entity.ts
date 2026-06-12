import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProcurementIssueRequestItem } from './procurement-issue-request-item.entity';
import { User } from '@/entity/user/user.entity';
import { ProcurementIssue } from './procurement-issue.entity';
import { Supplier } from '@/entity/supplier/supplier.entity';

@Entity()
export class ProcurementIssueRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  requestedBy: User;

  @ManyToOne(() => ProcurementIssue, (procurement) => procurement.requests)
  procurement: ProcurementIssue;

  @OneToMany(() => ProcurementIssueRequestItem, (item) => item.request, {
    cascade: true,
    orphanedRowAction: 'delete',
  })
  items: ProcurementIssueRequestItem[];

  @Column()
  title: string;

  @Column({ type: 'date' })
  orderDate: Date;

  @Column({ type: 'date', nullable: true })
  deliveryDate: Date;

  @Column({ nullable: true })
  paymentTerms: string;

  @Column()
  serialNumber: string;

  @Column({ type: 'bool', default: false })
  hasFee: boolean;

  @Column({ type: 'bool', default: false })
  requiresApproval: boolean;

  @Column({ type: 'bool', default: false })
  isApproved: boolean;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn()
  approvedBy?: User;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt?: Date;

  @ManyToOne(() => Supplier, { nullable: true })
  supplier: Supplier;

  @Column({ nullable: true })
  note: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}

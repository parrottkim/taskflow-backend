import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SupplierKeyword } from './supplier-keyword.entity';
import { ProcurementIssueItem } from '../issue/procurement/procurement-issue-item.entity';

@Entity()
export class Supplier {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column()
  number: string;

  @Column({ nullable: true })
  address?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  fax?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  logo?: string;

  @ManyToMany(() => SupplierKeyword, { cascade: true })
  @JoinTable({
    name: 'supplier_keywords',
    joinColumn: { name: 'supplier_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'keyword_id', referencedColumnName: 'id' },
  })
  keywords: SupplierKeyword[];

  @OneToMany(() => ProcurementIssueItem, (procurement) => procurement.supplier)
  procurements: ProcurementIssueItem[];
}

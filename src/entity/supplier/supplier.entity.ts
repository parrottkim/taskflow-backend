import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
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
  zipcode?: string;

  @Column({ nullable: true })
  roadAddress?: string;

  @Column({ nullable: true })
  roadAddressReference?: string;

  @Column({ nullable: true })
  detailAddress?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  logo?: string;

  @OneToMany(() => ProcurementIssueItem, (procurement) => procurement.supplier)
  procurements: ProcurementIssueItem[];
}

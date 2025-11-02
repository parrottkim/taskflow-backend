import { Column, Entity, PrimaryGeneratedColumn, ManyToMany } from 'typeorm';
import { Supplier } from './supplier.entity';

@Entity()
export class SupplierKeyword {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @ManyToMany(() => Supplier, (supplier) => supplier.keywords)
  suppliers: Supplier[];
}

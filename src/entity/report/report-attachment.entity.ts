import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Report } from './report.entity';

@Entity()
export class ReportAttachment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Report, (report) => report.attachments, {
    onDelete: 'CASCADE',
  })
  report: Report;

  @Column({ type: 'varchar' })
  filename: string;

  @Column()
  size: number;

  @Column({ type: 'varchar' })
  path: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}

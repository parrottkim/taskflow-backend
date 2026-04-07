// trip-report.entity.ts
import {
  Entity,
  OneToOne,
  JoinColumn,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Report } from '../report.entity'; // Report 엔티티 경로
import { TripActualExpense } from './trip-actual-expense.entity';
import { TripRegulationRate } from './trip-regulation-rate.entity';
import { TripFuelExpense } from './trip-fuel-expense.entity';
import { TripExchangeRate } from './trip-exchange-rate.entity';

@Entity()
@Index(['report'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class TripReport {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Report, (report) => report.trip)
  @JoinColumn()
  report: Report;

  @OneToMany(() => TripActualExpense, (expense) => expense.trip, {
    cascade: true,
    orphanedRowAction: 'delete',
  })
  expenses: TripActualExpense[];

  @OneToMany(() => TripRegulationRate, (rate) => rate.trip, {
    cascade: true,
    orphanedRowAction: 'delete',
  })
  rates: TripRegulationRate[];

  @OneToOne(() => TripFuelExpense, (fuel) => fuel.trip)
  fuel?: TripFuelExpense;

  @OneToOne(() => TripExchangeRate, (rate) => rate.trip, {
    cascade: true,
    orphanedRowAction: 'delete',
  })
  exchangeRate?: TripExchangeRate;

  @Column({ default: false })
  isDeducted: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}

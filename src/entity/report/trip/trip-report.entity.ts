// trip-report.entity.ts
import {
  Entity,
  OneToOne,
  JoinColumn,
  OneToMany,
  Column,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Report } from '../report.entity'; // Report 엔티티 경로
import { TripActualExpense } from './trip-actual-expense.entity';
import { TripRegulationRate } from './trip-regulation-rate.entity';
import { TripFuelExpense } from './trip-fuel-expense.entity';
import { TripExchangeRate } from './trip-exchange-rate.entity';

@Entity()
export class TripReport {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Report, (report) => report.trip)
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

  @OneToMany(() => TripExchangeRate, (rate) => rate.trip, {
    cascade: true,
    orphanedRowAction: 'delete',
  })
  exchangeRates: TripExchangeRate[];

  @Column({ default: false })
  isDeducted: boolean;
}

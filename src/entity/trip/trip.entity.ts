import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Schedule } from '../schedule/schedule.entity';
import { User } from '../user/user.entity';
import { TripActualExpense } from './trip-actual-expense.entity';
import { TripRegulationRate } from './trip-regulation-rate.entity';
import { TripFuelExpense } from './trip-fuel-expense.entity';

@Entity()
export class Trip {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Schedule, (schedule) => schedule.trip)
  @JoinColumn()
  schedule: Schedule;

  @ManyToOne(() => User, (user) => user.trips, { cascade: true })
  user: User;

  @OneToMany(() => TripActualExpense, (expense) => expense.trip, {
    cascade: true,
    orphanedRowAction: 'delete',
  })
  expenses: TripActualExpense[];

  @OneToMany(() => TripRegulationRate, (setting) => setting.trip, {
    cascade: true,
    orphanedRowAction: 'delete',
  })
  rates: TripRegulationRate[];

  @OneToOne(() => TripFuelExpense, (fuel) => fuel.trip)
  @JoinColumn()
  fuel?: TripFuelExpense;

  @Column({ default: false })
  isDeducted: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt!: Date | null;
}

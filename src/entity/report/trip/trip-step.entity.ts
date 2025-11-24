import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { TripCategory } from './trip-category.entity';
import { ScheduleCategory } from '../../schedule/schedule-category.entity';
import { TripActualExpense } from './trip-actual-expense.entity';
import { TripRegulationRate } from './trip-regulation-rate.entity';
import { TripRegulation } from './trip-regulation.entity';

@Entity()
export class TripStep {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => TripCategory, (category) => category.steps)
  category: TripCategory;

  @ManyToOne(() => ScheduleCategory, (category) => category.steps)
  scheduleCategory: ScheduleCategory;

  @OneToMany(() => TripRegulation, (accomodation) => accomodation.step)
  accommodations: TripRegulation[];

  @OneToMany(() => TripActualExpense, (expense) => expense.step)
  expenses: TripActualExpense[];

  @OneToMany(() => TripRegulationRate, (setting) => setting.step)
  rates: TripRegulationRate[];

  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;
}

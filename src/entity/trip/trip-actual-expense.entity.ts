import { DecimalColumnTransformer } from 'src/common/utils/transformer.utils';
import { Entity, PrimaryGeneratedColumn, ManyToOne, Column } from 'typeorm';
import { Trip } from './trip.entity';
import { TripStep } from './trip-step.entity';

@Entity()
export class TripActualExpense {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Trip, (trip) => trip.expenses)
  trip: Trip;

  @ManyToOne(() => TripStep, (step) => step.expenses)
  step: TripStep;

  @Column('decimal', {
    precision: 12,
    scale: 2,
    transformer: new DecimalColumnTransformer(),
  })
  price: number;

  @Column({ nullable: true })
  details?: string;
}

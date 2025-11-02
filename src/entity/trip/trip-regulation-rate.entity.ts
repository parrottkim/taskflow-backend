import { DecimalColumnTransformer } from 'src/common/utils/transformer.utils';
import { Entity, PrimaryGeneratedColumn, ManyToOne, Column } from 'typeorm';
import { TripStep } from './trip-step.entity';
import { Trip } from './trip.entity';

@Entity()
export class TripRegulationRate {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Trip, (trip) => trip.rates)
  trip: Trip;

  @ManyToOne(() => TripStep, (step) => step.rates)
  step: TripStep;

  @Column()
  days: number;

  @Column('decimal', {
    precision: 12,
    scale: 2,
    transformer: new DecimalColumnTransformer(),
  })
  rate: number;

  @Column({ nullable: true })
  details?: string;
}

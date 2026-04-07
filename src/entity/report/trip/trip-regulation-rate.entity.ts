import { DecimalColumnTransformer } from '@/common/utils/transformer.utils';
import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { TripReport } from './trip-report.entity';
import { TripStep } from './trip-step.entity';

@Entity()
export class TripRegulationRate {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => TripReport, (trip) => trip.rates)
  trip: TripReport;

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}

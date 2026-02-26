import { DecimalColumnTransformer } from 'src/common/utils/transformer.utils';
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
export class TripActualExpense {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => TripReport, (trip) => trip.expenses)
  trip: TripReport;

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}

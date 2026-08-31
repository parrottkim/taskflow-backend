import {
  DateColumnTransformer,
  DecimalColumnTransformer,
} from '@/common/utils/transformer.utils';
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
import { Currency } from '@/entity/currency/currency.entity';

@Entity()
export class TripActualExpense {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => TripReport, (trip) => trip.expenses)
  trip: TripReport;

  @ManyToOne(() => TripStep, (step) => step.expenses)
  step: TripStep;

  @ManyToOne(() => Currency, { nullable: true })
  currency?: Currency;

  @Column('decimal', {
    precision: 12,
    scale: 2,
    transformer: new DecimalColumnTransformer(),
  })
  price: number;

  @Column({
    type: 'date',
    nullable: true,
    transformer: new DateColumnTransformer(),
  })
  paymentDate?: Date;

  @Column('decimal', {
    precision: 10,
    scale: 4,
    default: 1,
    transformer: new DecimalColumnTransformer(),
  })
  exchangeRate: number;

  @Column({
    type: 'date',
    nullable: true,
    transformer: new DateColumnTransformer(),
  })
  exchangeRateAppliedDate?: Date;

  @Column({ nullable: true })
  details?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}

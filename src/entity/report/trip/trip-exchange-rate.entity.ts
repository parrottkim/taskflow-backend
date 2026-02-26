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

@Entity()
export class TripExchangeRate {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => TripReport, (trip) => trip.exchangeRates)
  trip: TripReport;

  @Column('decimal', {
    precision: 10,
    scale: 4,
    transformer: new DecimalColumnTransformer(),
  })
  rate: number; // 1 USD = rate KRW

  @Column()
  appliedDate: Date; // 환율 적용 날짜

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}

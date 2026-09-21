import { DecimalColumnTransformer } from '@/common/utils/transformer.utils';
import {
  Entity,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
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

  @OneToOne(() => TripReport, (trip) => trip.exchangeRate, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'trip_id' })
  trip: TripReport;

  @Column('decimal', {
    precision: 10,
    scale: 4,
    transformer: new DecimalColumnTransformer(),
  })
  rate: number;

  @Column({ type: 'date' })
  appliedDate: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}

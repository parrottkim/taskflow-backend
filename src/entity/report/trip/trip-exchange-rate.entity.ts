import {
  Entity,
  PrimaryGeneratedColumn,
  OneToOne,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { TripReport } from './trip-report.entity';
import { DecimalColumnTransformer } from '@/common/utils/transformer.utils';

@Entity()
@Index(['trip'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class TripExchangeRate {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => TripReport, (trip) => trip.exchangeRate)
  @JoinColumn({ name: 'trip_id' })
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

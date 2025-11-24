import { DecimalColumnTransformer } from 'src/common/utils/transformer.utils';
import {
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  Entity,
  JoinColumn,
} from 'typeorm';
import { TripReport } from './trip-report.entity';

@Entity()
export class TripFuelExpense {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => TripReport, (trip) => trip.fuel)
  @JoinColumn()
  trip: TripReport;

  @Column('decimal', {
    precision: 12,
    scale: 2,
    transformer: new DecimalColumnTransformer(),
  })
  rate: number;

  @Column('decimal', {
    precision: 12,
    scale: 2,
    transformer: new DecimalColumnTransformer(),
  })
  mileage: number;

  @Column()
  distance: number;
}

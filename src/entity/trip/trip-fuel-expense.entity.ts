import { DecimalColumnTransformer } from 'src/common/utils/transformer.utils';
import {
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  OneToOne,
  Entity,
} from 'typeorm';
import { Trip } from './trip.entity';

@Entity()
export class TripFuelExpense {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Trip, (trip) => trip.fuel)
  trip: Trip;

  @Column('decimal', {
    precision: 12,
    scale: 2,
    transformer: new DecimalColumnTransformer(),
  })
  rate: number;

  @Column()
  mileage: number;

  @Column()
  distance: number;
}

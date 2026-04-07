import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { DecimalColumnTransformer } from '@/common/utils/transformer.utils';
import { TripStep } from './trip-step.entity';

@Entity()
export class TripRegulation {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => TripStep, (step) => step.accommodations)
  step: TripStep;

  @Column('decimal', {
    precision: 12,
    scale: 2,
    transformer: new DecimalColumnTransformer(),
  })
  rate: number;
}

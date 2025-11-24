import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Schedule } from './schedule.entity';
import { TripStep } from '../report/trip/trip-step.entity';

@Entity()
export class ScheduleCategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar' })
  color: string;

  @OneToMany(() => Schedule, (schedule) => schedule.category)
  schedules: Schedule[];

  @OneToMany(() => TripStep, (step) => step.scheduleCategory)
  steps: TripStep[];
}

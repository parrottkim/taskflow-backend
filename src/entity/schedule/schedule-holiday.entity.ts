import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Schedule } from './schedule.entity';

@Entity()
@Unique(['schedule', 'date'])
export class ScheduleHoliday {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Schedule, (schedule) => schedule.holidays, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  schedule: Schedule;

  @Column({
    type: 'enum',
    enum: ['WEEKEND', 'PUBLIC_HOLIDAY'],
  })
  type: 'WEEKEND' | 'PUBLIC_HOLIDAY';

  @Column({ type: 'date' })
  date: Date;

  @Column({ nullable: true })
  name?: string;

  @Column({ default: false })
  isTravelOnly: boolean;

  @Column({ type: 'date', nullable: true })
  compensatoryLeaveDate?: Date;
}

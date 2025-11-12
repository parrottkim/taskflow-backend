import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ScheduleCategory } from './schedule-category.entity';
import { Project } from '../project/project.entity';
import { User } from '../user/user.entity';
import { Trip } from '../trip/trip.entity';

@Entity()
export class Schedule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', unique: true })
  eventId: string;

  @ManyToOne(() => ScheduleCategory, (category) => category.schedules)
  category: ScheduleCategory;

  @ManyToOne(() => Project, (project) => project.schedules, {
    cascade: true,
    eager: true,
  })
  project: Project;

  @OneToOne(() => Trip, (trip) => trip.schedule)
  @JoinColumn()
  trip: Trip;

  @ManyToOne(() => User, (user) => user.schedules, { cascade: true })
  user: User;

  @Column({ type: 'varchar' })
  summary: string;

  @Column({ type: 'varchar', nullable: true })
  description?: string;

  @Column({ type: 'varchar' })
  url: string;

  @Column()
  start: Date;

  @Column()
  end: Date;
}

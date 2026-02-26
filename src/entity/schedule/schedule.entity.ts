import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ScheduleCategory } from './schedule-category.entity';
import { Project } from '../project/project.entity';
import { User } from '../user/user.entity';
import { Report } from '../report/report.entity';

@Entity()
export class Schedule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', unique: true })
  eventId: string;

  @ManyToOne(() => ScheduleCategory, (category) => category.schedules)
  category: ScheduleCategory;

  @ManyToOne(() => Project, (project) => project.schedules)
  project: Project;

  @OneToMany(() => Report, (report) => report.schedule, {
    nullable: true,
  })
  reports: Report[];

  @ManyToOne(() => User, (user) => user.schedules)
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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt!: Date | null;
}

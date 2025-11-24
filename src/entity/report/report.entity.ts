import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Schedule } from '../schedule/schedule.entity';
import { User } from '../user/user.entity';
import { ReportAttachment } from './report-attachment.entity';
import { TripReport } from './trip/trip-report.entity';

@Entity()
export class Report {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Schedule, (schedule) => schedule.report)
  @JoinColumn()
  schedule: Schedule;

  @ManyToOne(() => User, (user) => user.reports, { cascade: true })
  user: User;

  @OneToOne(() => TripReport, (trip) => trip.report, {
    nullable: true, // 원격 대응 보고서일 경우 NULL
    cascade: true,
  })
  trip?: TripReport;

  @Column()
  content: string;

  @OneToMany(() => ReportAttachment, (attachment) => attachment.report, {
    cascade: true,
    orphanedRowAction: 'delete',
  })
  attachments: ReportAttachment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt!: Date | null;
}

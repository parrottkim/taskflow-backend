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
import { Schedule } from '../schedule/schedule.entity';
import { User } from '../user/user.entity';
import { ReportAttachment } from './report-attachment.entity';
import { TripReport } from './trip/trip-report.entity';
import { Project } from '../project/project.entity';

@Entity()
@Index(['schedule'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class Report {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Schedule, (schedule) => schedule.reports, {
    nullable: true,
  })
  schedule: Schedule;

  @ManyToOne(() => Project, (project) => project.reports)
  project: Project;

  @ManyToOne(() => User, (user) => user.createdReports, { cascade: true })
  createdBy: User;

  @ManyToOne(() => User, (user) => user.updatedReports, { nullable: true })
  updatedBy?: User;

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

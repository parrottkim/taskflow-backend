import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
  UpdateDateColumn,
} from 'typeorm';
import { Schedule } from './schedule.entity';
import { ScheduleCalendarEventPayload } from '@/schedule/schedule-calendar.types';

export enum ScheduleCalendarSyncOperation {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

export enum ScheduleCalendarSyncStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
}

@Entity()
@Index('IDX_schedule_calendar_sync_pending', ['status', 'nextAttemptAt', 'id'])
export class ScheduleCalendarSync {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Schedule, (schedule) => schedule.calendarSyncs, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'schedule_id' })
  schedule: Schedule;

  @RelationId((sync: ScheduleCalendarSync) => sync.schedule)
  scheduleId: number;

  @Column({
    type: 'enum',
    enum: ScheduleCalendarSyncOperation,
  })
  operation: ScheduleCalendarSyncOperation;

  @Column({
    type: 'enum',
    enum: ScheduleCalendarSyncStatus,
    default: ScheduleCalendarSyncStatus.PENDING,
  })
  status: ScheduleCalendarSyncStatus;

  @Column({ type: 'jsonb', default: {} })
  payload: ScheduleCalendarEventPayload;

  @Column({ type: 'varchar' })
  eventId: string;

  @Column({ type: 'integer', default: 0 })
  attempts: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  nextAttemptAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lockedAt?: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  processedAt?: Date | null;

  @Column({ type: 'text', nullable: true })
  lastError?: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

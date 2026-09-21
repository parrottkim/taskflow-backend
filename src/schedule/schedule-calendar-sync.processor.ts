import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  ScheduleCalendarSync,
  ScheduleCalendarSyncOperation,
  ScheduleCalendarSyncStatus,
} from '@/entity/schedule/schedule-calendar-sync.entity';
import { Schedule } from '@/entity/schedule/schedule.entity';
import { ScheduleCalendarClient } from './schedule-calendar.client';

@Injectable()
export class ScheduleCalendarSyncProcessor {
  private readonly logger = new Logger(ScheduleCalendarSyncProcessor.name);
  private readonly maxAttempts = 10;
  private readonly batchSize = 20;
  private isProcessing = false;

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ScheduleCalendarSync)
    private readonly syncRepository: Repository<ScheduleCalendarSync>,
    private readonly calendarClient: ScheduleCalendarClient,
  ) {}

  @Interval(10_000)
  async processPendingCalendarSyncs() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      await this.releaseStaleClaims();

      for (let index = 0; index < this.batchSize; index += 1) {
        const sync = await this.claimNext();
        if (!sync) break;

        await this.processClaimed(sync);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async claimNext() {
    const retryableStatuses = [
      ScheduleCalendarSyncStatus.PENDING,
      ScheduleCalendarSyncStatus.FAILED,
    ];
    const candidate = await this.syncRepository
      .createQueryBuilder('sync')
      .where('sync.status IN (:...retryableStatuses)', { retryableStatuses })
      .andWhere('sync.nextAttemptAt <= :now', { now: new Date() })
      .andWhere('sync.attempts < :maxAttempts', {
        maxAttempts: this.maxAttempts,
      })
      .andWhere(
        `NOT EXISTS (
          SELECT 1
          FROM "schedule_calendar_sync" "earlier"
          WHERE "earlier"."schedule_id" = "sync"."schedule_id"
            AND "earlier"."id" < "sync"."id"
            AND "earlier"."status" <> :succeeded
        )`,
        { succeeded: ScheduleCalendarSyncStatus.SUCCEEDED },
      )
      .orderBy('sync.id', 'ASC')
      .getOne();

    if (!candidate) return null;

    const claimed = await this.syncRepository
      .createQueryBuilder()
      .update(ScheduleCalendarSync)
      .set({
        status: ScheduleCalendarSyncStatus.PROCESSING,
        attempts: () => '"attempts" + 1',
        lockedAt: new Date(),
        lastError: null,
      })
      .where('id = :id', { id: candidate.id })
      .andWhere('status IN (:...retryableStatuses)', { retryableStatuses })
      .execute();

    if (claimed.affected !== 1) return null;

    return this.syncRepository.findOneBy({ id: candidate.id });
  }

  private async processClaimed(sync: ScheduleCalendarSync) {
    try {
      if (sync.operation === ScheduleCalendarSyncOperation.CREATE) {
        await this.calendarClient.createEvent(sync.eventId, sync.payload);
      } else if (sync.operation === ScheduleCalendarSyncOperation.UPDATE) {
        await this.calendarClient.updateEvent(sync.eventId, sync.payload);
      } else {
        await this.calendarClient.deleteEvent(sync.eventId);
      }

      await this.dataSource.transaction(async (manager) => {
        if (sync.operation !== ScheduleCalendarSyncOperation.DELETE) {
          await manager.update(Schedule, sync.scheduleId, {
            eventId: sync.eventId,
          });
        }

        await manager.update(ScheduleCalendarSync, sync.id, {
          status: ScheduleCalendarSyncStatus.SUCCEEDED,
          processedAt: new Date(),
          lockedAt: null,
          lastError: null,
        });
      });
    } catch (error) {
      const message = this.getErrorMessage(error);
      const retryDelayMinutes = Math.min(2 ** sync.attempts, 60);
      const nextAttemptAt = new Date(
        Date.now() + retryDelayMinutes * 60 * 1000,
      );

      await this.syncRepository.update(sync.id, {
        status: ScheduleCalendarSyncStatus.FAILED,
        nextAttemptAt,
        lockedAt: null,
        lastError: message.slice(0, 4000),
      });
      this.logger.warn(
        `Google Calendar 동기화 실패: syncId=${sync.id}, scheduleId=${sync.scheduleId}, attempt=${sync.attempts}`,
        message,
      );
    }
  }

  private releaseStaleClaims() {
    const staleBefore = new Date(Date.now() - 15 * 60 * 1000);

    return this.syncRepository
      .createQueryBuilder()
      .update(ScheduleCalendarSync)
      .set({
        status: ScheduleCalendarSyncStatus.PENDING,
        lockedAt: null,
      })
      .where('status = :status', {
        status: ScheduleCalendarSyncStatus.PROCESSING,
      })
      .andWhere('lockedAt < :staleBefore', { staleBefore })
      .execute();
  }

  private getErrorMessage(error: unknown) {
    return error instanceof Error
      ? error.stack || error.message
      : String(error);
  }
}

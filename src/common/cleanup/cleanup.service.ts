import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { ReportAttachment } from 'src/entity/report/report-attachment.entity';
import { IssueAttachment } from 'src/entity/issue/issue-attachment.entity';
import { SftpService } from 'src/sftp/sftp.service';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);
  private readonly DAYS_BEFORE_DELETE = 30; // 30일 이상 지난 파일만 최종 삭제

  constructor(
    @InjectRepository(ReportAttachment)
    private readonly reportAttachmentRepository: Repository<ReportAttachment>,
    @InjectRepository(IssueAttachment)
    private readonly issueAttachmentRepository: Repository<IssueAttachment>,
    private readonly sftpService: SftpService,
  ) {}

  /**
   * 매주 일요일 자정에 실행
   * 30일 이상 soft deleted된 attachment 파일을 물리 삭제
   */
  @Cron(CronExpression.EVERY_WEEK, { timeZone: 'Asia/Seoul' })
  async cleanupDeletedAttachments() {
    this.logger.log('Starting cleanup of deleted attachments...');

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - this.DAYS_BEFORE_DELETE);

      // 30일 이상 soft deleted된 report attachment 조회
      const deletedReportAttachments = await this.reportAttachmentRepository
        .createQueryBuilder('attachment')
        .withDeleted()
        .where('attachment.deleted_at IS NOT NULL')
        .andWhere('attachment.deleted_at < :date', { date: thirtyDaysAgo })
        .getMany();

      // 30일 이상 soft deleted된 issue attachment 조회
      const deletedIssueAttachments = await this.issueAttachmentRepository
        .createQueryBuilder('attachment')
        .withDeleted()
        .where('attachment.deleted_at IS NOT NULL')
        .andWhere('attachment.deleted_at < :date', { date: thirtyDaysAgo })
        .getMany();

      const totalDeleted =
        deletedReportAttachments.length + deletedIssueAttachments.length;
      if (totalDeleted === 0) {
        this.logger.log('No attachments to cleanup');
        return;
      }

      this.logger.log(
        `Found ${totalDeleted} attachments to cleanup (${deletedReportAttachments.length} report, ${deletedIssueAttachments.length} issue)`,
      );

      // SFTP에서 파일 물리 삭제
      let deletedCount = 0;

      // Report attachments 처리
      for (const attachment of deletedReportAttachments) {
        try {
          const archivedPath = attachment.path.replace('/files/', '/archived/');
          await this.sftpService.deleteFileByPath(archivedPath);
          deletedCount++;
        } catch (e) {
          this.logger.warn(
            `Failed to delete report attachment from SFTP: ${attachment.path}`,
            e,
          );
        }
      }

      // Issue attachments 처리
      for (const attachment of deletedIssueAttachments) {
        try {
          const archivedPath = attachment.path.replace('/files/', '/archived/');
          await this.sftpService.deleteFileByPath(archivedPath);
          deletedCount++;
        } catch (e) {
          this.logger.warn(
            `Failed to delete issue attachment from SFTP: ${attachment.path}`,
            e,
          );
        }
      }

      // DB에서 hard delete
      const reportDeletedIds = deletedReportAttachments.map((att) => att.id);
      const issueDeletedIds = deletedIssueAttachments.map((att) => att.id);

      if (reportDeletedIds.length > 0) {
        await this.reportAttachmentRepository
          .createQueryBuilder()
          .delete()
          .where('id IN (:...ids)', { ids: reportDeletedIds })
          .execute();
      }

      if (issueDeletedIds.length > 0) {
        await this.issueAttachmentRepository
          .createQueryBuilder()
          .delete()
          .where('id IN (:...ids)', { ids: issueDeletedIds })
          .execute();
      }

      this.logger.log(
        `Cleanup completed: ${deletedCount} files deleted, ${totalDeleted} DB records removed`,
      );
    } catch (error) {
      this.logger.error('Error during cleanup', error);
    }
  }
}

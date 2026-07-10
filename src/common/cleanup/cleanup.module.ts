import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportAttachment } from '@/entity/report/report-attachment.entity';
import { IssueAttachment } from '@/entity/issue/issue-attachment.entity';
import { SftpModule } from '@/sftp/sftp.module';
import { CleanupService } from './cleanup.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReportAttachment, IssueAttachment]),
    SftpModule,
  ],
  providers: [CleanupService],
})
export class CleanupModule {}

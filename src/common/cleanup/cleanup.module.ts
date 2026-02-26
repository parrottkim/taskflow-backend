import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportAttachment } from 'src/entity/report/report-attachment.entity';
import { IssueAttachment } from 'src/entity/issue/issue-attachment.entity';
import { SftpModule } from 'src/sftp/sftp.module';
import { CleanupService } from './cleanup.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReportAttachment, IssueAttachment]),
    SftpModule,
  ],
  providers: [CleanupService],
  exports: [CleanupService],
})
export class CleanupModule {}

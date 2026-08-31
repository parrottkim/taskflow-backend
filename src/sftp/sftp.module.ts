import { Module } from '@nestjs/common';
import { SftpService } from './sftp.service';
import { SftpController } from './sftp.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentAttachment } from '@/entity/document/document-attachment.entity';
import { IssueAttachment } from '@/entity/issue/issue-attachment.entity';
import { ReportAttachment } from '@/entity/report/report-attachment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DocumentAttachment,
      IssueAttachment,
      ReportAttachment,
    ]),
  ],
  controllers: [SftpController],
  providers: [SftpService],
  exports: [SftpService],
})
export class SftpModule {}

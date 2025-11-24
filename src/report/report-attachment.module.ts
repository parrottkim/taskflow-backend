import { Module } from '@nestjs/common';
import { ReportAttachmentController } from './report-attachment.controller';
import { ReportAttachmentService } from './report-attachment.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportAttachment } from 'src/entity/report/report-attachment.entity';
import { SftpService } from 'src/sftp/sftp.service';

@Module({
  imports: [TypeOrmModule.forFeature([ReportAttachment])],
  providers: [ReportAttachmentService, SftpService],
  controllers: [ReportAttachmentController],
  exports: [ReportAttachmentService],
})
export class ReportAttachmentModule {}

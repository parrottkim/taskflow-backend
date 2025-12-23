import { Module } from '@nestjs/common';
import { ReportAttachmentController } from './report-attachment.controller';
import { ReportAttachmentService } from './report-attachment.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportAttachment } from 'src/entity/report/report-attachment.entity';
import { SftpModule } from 'src/sftp/sftp.module';

@Module({
  imports: [TypeOrmModule.forFeature([ReportAttachment]), SftpModule],
  providers: [ReportAttachmentService],
  controllers: [ReportAttachmentController],
  exports: [ReportAttachmentService],
})
export class ReportAttachmentModule {}

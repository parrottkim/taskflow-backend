import { Module } from '@nestjs/common';
import { IssueAttachmentController } from './issue-attachment.controller';
import { IssueAttachmentService } from './issue-attachment.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IssueAttachment } from 'src/entity/issue/issue-attachment.entity';
import { SftpService } from 'src/sftp/sftp.service';

@Module({
  imports: [TypeOrmModule.forFeature([IssueAttachment])],
  providers: [IssueAttachmentService, SftpService],
  controllers: [IssueAttachmentController],
  exports: [IssueAttachmentService],
})
export class IssueAttachmentModule {}

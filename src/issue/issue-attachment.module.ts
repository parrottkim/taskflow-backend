import { Module } from '@nestjs/common';
import { IssueAttachmentController } from './issue-attachment.controller';
import { IssueAttachmentService } from './issue-attachment.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IssueAttachment } from '@/entity/issue/issue-attachment.entity';
import { SftpModule } from '@/sftp/sftp.module';

@Module({
  imports: [TypeOrmModule.forFeature([IssueAttachment]), SftpModule],
  providers: [IssueAttachmentService],
  controllers: [IssueAttachmentController],
})
export class IssueAttachmentModule {}

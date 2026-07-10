import { Module } from '@nestjs/common';
import { DocumentAttachmentService } from './document-attachment.service';
import { DocumentAttachmentController } from './document-attachment.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentAttachment } from '@/entity/document/document-attachment.entity';
import { SftpModule } from '@/sftp/sftp.module';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentAttachment]), SftpModule],
  controllers: [DocumentAttachmentController],
  providers: [DocumentAttachmentService],
})
export class DocumentAttachmentModule {}

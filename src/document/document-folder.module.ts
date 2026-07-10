import { Module } from '@nestjs/common';
import { DocumentFolderService } from './document-folder.service';
import { DocumentFolderController } from './document-folder.controller';
import { DocumentFolder } from '@/entity/document/document-folder.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentFolderClosure } from '@/entity/document/document-folder-closure.entity';
import { DocumentAttachmentModule } from './document-attachment.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentFolder, DocumentFolderClosure]),
    DocumentAttachmentModule,
  ],
  controllers: [DocumentFolderController],
  providers: [DocumentFolderService],
})
export class DocumentFolderModule {}

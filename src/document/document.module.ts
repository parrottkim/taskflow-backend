import { Module } from '@nestjs/common';
import { DocumentService } from './document.service';
import { DocumentController } from './document.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from '@/entity/document/document.entity';
import { DocumentAttachment } from '@/entity/document/document-attachment.entity';
import { DocumentFolder } from '@/entity/document/document-folder.entity';
import { DocumentEditGuard } from '@/common/guards/document-edit.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document, DocumentAttachment, DocumentFolder]),
  ],
  controllers: [DocumentController],
  providers: [DocumentService, DocumentEditGuard],
})
export class DocumentModule {}

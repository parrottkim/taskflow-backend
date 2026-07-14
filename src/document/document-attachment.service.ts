import { DocumentAttachment } from '@/entity/document/document-attachment.entity';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { User } from '@/entity/user/user.entity';
import { SftpService } from '@/sftp/sftp.service';
import { Repository } from 'typeorm';
import { DocumentAttachmentDto } from './dto/document-attachment';
import { assertWriteAccess } from '@/common/policies/write-access.policy';

@Injectable()
export class DocumentAttachmentService {
  constructor(
    @InjectRepository(DocumentAttachment)
    private readonly documentAttachmentRepository: Repository<DocumentAttachment>,
    private readonly sftpService: SftpService,
  ) {}

  async uploadAttachments(
    user: User,
    documentId: number,
    files: Express.Multer.File[],
  ) {
    assertWriteAccess(user);
    const uploadedFiles = await this.sftpService.uploadAttachments(
      'document',
      documentId,
      files,
    );

    const attachments = uploadedFiles.map((file) =>
      this.documentAttachmentRepository.create({
        ...file,
        document: { id: documentId },
      }),
    );

    const saved = await this.documentAttachmentRepository.save(attachments);

    return plainToInstance(DocumentAttachmentDto, saved, {
      excludeExtraneousValues: true,
    });
  }

  async deleteAttachment(user: User, documentId: number, fileId: number) {
    assertWriteAccess(user);
    const attachment = await this.documentAttachmentRepository.findOne({
      where: { id: fileId, document: { id: documentId } },
    });
    if (!attachment) throw new NotFoundException('not_found');

    await this.documentAttachmentRepository.remove(attachment);
    await this.sftpService.deleteFileByPath(attachment.path);

    return true;
  }
}

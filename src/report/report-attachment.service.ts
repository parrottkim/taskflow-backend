import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { ReportAttachment } from '@/entity/report/report-attachment.entity';
import { User } from '@/entity/user/user.entity';
import { SftpService } from '@/sftp/sftp.service';
import { Repository } from 'typeorm';
import { ReportAttachmentDto } from './dto/report-attachment';
import { assertWriteAccess } from '@/common/policies/write-access.policy';

@Injectable()
export class ReportAttachmentService {
  constructor(
    @InjectRepository(ReportAttachment)
    private readonly reportAttachmentRepository: Repository<ReportAttachment>,
    private readonly sftpService: SftpService,
  ) {}

  async uploadAttachments(
    user: User,
    reportId: number,
    files: Express.Multer.File[],
  ) {
    assertWriteAccess(user);
    const uploadedFiles = await this.sftpService.uploadAttachments(
      'report',
      reportId,
      files,
    );

    const attachments = uploadedFiles.map((file) =>
      this.reportAttachmentRepository.create({
        ...file,
        report: { id: reportId },
      }),
    );

    const saved = await this.reportAttachmentRepository.save(attachments);

    const reportAttachmentDto = plainToInstance(ReportAttachmentDto, saved, {
      excludeExtraneousValues: true, // @Expose가 붙은 필드만 포함
    });

    return reportAttachmentDto;
  }

  async deleteAttachment(user: User, reportId: number, fileId: number) {
    assertWriteAccess(user);
    const attachment = await this.reportAttachmentRepository.findOne({
      where: { id: fileId, report: { id: reportId } },
    });
    if (!attachment) throw new NotFoundException('not_found');

    await this.reportAttachmentRepository.remove(attachment);
    // 필요하면 SFTP에서도 삭제
    await this.sftpService.deleteFileByPath(attachment.path);
    return true;
  }
}

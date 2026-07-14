import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { IssueAttachment } from '@/entity/issue/issue-attachment.entity';
import { User } from '@/entity/user/user.entity';
import { SftpService } from '@/sftp/sftp.service';
import { Repository } from 'typeorm';
import { IssueAttachmentDto } from './dto/issue-attachment';
import { assertWriteAccess } from '@/common/policies/write-access.policy';

@Injectable()
export class IssueAttachmentService {
  constructor(
    @InjectRepository(IssueAttachment)
    private readonly issueAttachmentRepository: Repository<IssueAttachment>,
    private readonly sftpService: SftpService,
  ) {}

  async uploadAttachments(
    user: User,
    issueId: number,
    files: Express.Multer.File[],
  ) {
    assertWriteAccess(user);
    const uploadedFiles = await this.sftpService.uploadAttachments(
      'issue',
      issueId,
      files,
    );

    const attachments = uploadedFiles.map((file) =>
      this.issueAttachmentRepository.create({
        ...file,
        issue: { id: issueId },
      }),
    );

    const saved = await this.issueAttachmentRepository.save(attachments);

    const issueAttachmentDto = plainToInstance(IssueAttachmentDto, saved, {
      excludeExtraneousValues: true, // @Expose가 붙은 필드만 포함
    });

    return issueAttachmentDto;
  }

  async deleteAttachment(user: User, issueId: number, fileId: number) {
    assertWriteAccess(user);
    const attachment = await this.issueAttachmentRepository.findOne({
      where: { id: fileId, issue: { id: issueId } },
    });
    if (!attachment) throw new NotFoundException('not_found');

    await this.issueAttachmentRepository.remove(attachment);
    // 필요하면 SFTP에서도 삭제
    await this.sftpService.deleteFileByPath(attachment.path);
    return true;
  }
}

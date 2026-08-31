import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import Client from 'ssh2-sftp-client';
import { readFileSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import config from '@/config/config';
import { ConfigType } from '@nestjs/config';
import { User } from '@/entity/user/user.entity';
import { UploadInlineImageDto } from './dto/upload-inline-image';
import { plainToInstance } from 'class-transformer';
import { assertWriteAccess } from '@/common/policies/write-access.policy';
import { assertAdmin } from '@/common/policies/admin-access.policy';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentAttachment } from '@/entity/document/document-attachment.entity';
import { IssueAttachment } from '@/entity/issue/issue-attachment.entity';
import { ReportAttachment } from '@/entity/report/report-attachment.entity';
import { posix } from 'node:path';

interface UploadedAttachment {
  filename: string;
  size: number;
  path: string;
  url: string;
}

@Injectable()
export class SftpService {
  constructor(
    @Inject(config.KEY)
    private readonly configService: ConfigType<typeof config>,
    @InjectRepository(DocumentAttachment)
    private readonly documentAttachmentRepository: Repository<DocumentAttachment>,
    @InjectRepository(IssueAttachment)
    private readonly issueAttachmentRepository: Repository<IssueAttachment>,
    @InjectRepository(ReportAttachment)
    private readonly reportAttachmentRepository: Repository<ReportAttachment>,
  ) {}

  private async withSftp<T>(action: (sftp: Client) => Promise<T>): Promise<T> {
    const sftp = new Client();
    const privateKey = readFileSync(
      join(process.cwd(), this.configService.sftp.privateKeyPath),
      'utf-8',
    );

    try {
      await sftp.connect({
        host: this.configService.sftp.host,
        port: this.configService.sftp.port,
        username: this.configService.sftp.username,
        privateKey,
        passphrase: this.configService.sftp.passphrase,
        readyTimeout: 10000,
        keepaliveInterval: 10000,
      });

      return await action(sftp);
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      throw new InternalServerErrorException(
        'internal_server_error_sftp_connection_failed',
      );
    } finally {
      try {
        await sftp.end();
      } catch (err) {
        // 무시: Windows에서 발생하는 ECONNRESET 방지
      }
    }
  }

  private normalizeRemoteSegment(segment: string) {
    const normalized = segment.trim().replace(/^\/+|\/+$/g, '');

    if (
      !normalized ||
      normalized.includes('..') ||
      /^[a-z]+:\/\//i.test(normalized)
    ) {
      throw new BadRequestException('bad_request_sftp_path_invalid');
    }

    return normalized;
  }

  private buildRemotePath(...segments: string[]) {
    const basePath = this.configService.sftp.path.trim().replace(/\/+$/g, '');
    const normalizedSegments = segments.map((segment) =>
      this.normalizeRemoteSegment(segment),
    );

    return [basePath, ...normalizedSegments].filter(Boolean).join('/');
  }

  private normalizeDownloadPath(path: string): string {
    const suppliedPath = path.trim();
    const basePath = posix.normalize(
      this.configService.sftp.path.trim().replace(/\/+$/g, ''),
    );
    const normalizedPath = posix.normalize(suppliedPath);

    if (
      !suppliedPath ||
      suppliedPath.includes('\\') ||
      suppliedPath.includes('\0') ||
      normalizedPath !== suppliedPath ||
      normalizedPath === basePath ||
      !normalizedPath.startsWith(`${basePath}/`)
    ) {
      throw new BadRequestException('bad_request_sftp_path_invalid');
    }

    return normalizedPath;
  }

  private async findAttachmentByPath(path: string) {
    const [documentAttachment, issueAttachment, reportAttachment] =
      await Promise.all([
        this.documentAttachmentRepository.findOne({
          where: { path },
          relations: ['document'],
        }),
        this.issueAttachmentRepository.findOne({
          where: { path },
          relations: ['issue'],
        }),
        this.reportAttachmentRepository.findOne({
          where: { path },
          relations: ['report'],
        }),
      ]);

    return documentAttachment ?? issueAttachment ?? reportAttachment;
  }

  async uploadFile(buffer: Buffer, path: string) {
    return this.withSftp(async (sftp) => {
      const directory = path.substring(0, path.lastIndexOf('/'));
      const exists = await sftp.exists(directory);
      if (!exists) {
        await sftp.mkdir(directory, true);
      }
      await sftp.put(buffer, path);

      return plainToInstance(UploadInlineImageDto, {
        path,
        url: `${this.configService.sftp.url}${path}`,
      });
    });
  }

  async downloadFile(user: User, path: string) {
    const normalizedPath = this.normalizeDownloadPath(path);
    const attachment = await this.findAttachmentByPath(normalizedPath);

    if (!attachment) {
      throw new NotFoundException('not_found_attachment');
    }

    // 현재 문서/이슈/보고서 읽기 정책은 승인된 사용자 전체 공개다.
    // 부모 relation까지 조회하여 삭제된 리소스의 고아 첨부파일 접근도 차단한다.
    const hasParent =
      ('document' in attachment && Boolean(attachment.document)) ||
      ('issue' in attachment && Boolean(attachment.issue)) ||
      ('report' in attachment && Boolean(attachment.report));
    if (!user.isAuthorized || !hasParent) {
      throw new ForbiddenException('forbidden_access_denied');
    }

    return this.withSftp(async (sftp) => {
      const exists = await sftp.exists(normalizedPath);
      if (!exists) {
        throw new NotFoundException('not_found_file');
      }

      const buffer = (await sftp.get(normalizedPath)) as Buffer;
      const filename = attachment.filename;

      return { buffer, filename };
    });
  }

  async deleteFileByUrl(url: string) {
    const baseUrl = this.configService.sftp.url;

    if (!url.startsWith(baseUrl)) {
      throw new InternalServerErrorException(
        'internal_server_error_sftp_url_invalid',
      );
    }

    const path = url.replace(baseUrl, '');

    // 최종 삭제 로직은 deleteFileByPath를 호출
    await this.deleteFileByPath(path);
  }

  async deleteFileByPath(path: string) {
    return this.withSftp(async (sftp) => {
      const exists = await sftp.exists(path);
      if (exists) {
        await sftp.delete(path);
      }
    });
  }

  async archiveFileByPath(path: string) {
    return this.withSftp(async (sftp) => {
      const exists = await sftp.exists(path);
      if (exists) {
        const timestamp = Date.now();
        const archivedPath = `${this.configService.sftp.path}/archived/${timestamp}/${path.split('/').pop()}`;

        // archived 폴더 생성
        const archiveDir = `${this.configService.sftp.path}/archived/${timestamp}`;
        try {
          await sftp.mkdir(archiveDir, true);
        } catch (e) {
          // 폴더가 이미 있으면 무시
        }

        // 파일 이동
        await sftp.rename(path, archivedPath);
      }
    });
  }

  private getExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop() : '';
  }

  async uploadInlineImages(
    user: User,
    namespace: string,
    resourceId: number,
    files: Express.Multer.File[],
  ): Promise<UploadInlineImageDto[]> {
    assertWriteAccess(user);
    if (!files.length) return [];
    if (!Number.isInteger(resourceId) || resourceId < 1) {
      throw new BadRequestException('bad_request_resource_id_invalid');
    }

    const directory = 'inline-images';
    const basePath = this.buildRemotePath(
      directory,
      namespace,
      String(resourceId),
    );
    const now = new Date();
    const date = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;
    const uploadDirectory = `${basePath}/${date}`;

    return this.withSftp(async (sftp) => {
      const exists = await sftp.exists(uploadDirectory);
      if (!exists) {
        await sftp.mkdir(uploadDirectory, true);
      }

      const images: UploadInlineImageDto[] = [];
      for (const file of files) {
        const extension = this.getExtension(file.originalname);
        const uuid = `${uuidv4()}${extension ? '.' + extension : ''}`;
        const path = `${uploadDirectory}/${uuid}`;

        await sftp.put(file.buffer, path);
        images.push(
          plainToInstance(UploadInlineImageDto, {
            path,
            url: `${this.configService.sftp.url}${path}`,
          }),
        );
      }

      return images;
    });
  }

  async uploadAttachments(
    namespace: string,
    resourceId: number,
    files: Express.Multer.File[],
  ): Promise<UploadedAttachment[]> {
    if (!files.length) return [];

    const directory = 'attachments';
    const basePath = this.buildRemotePath(
      directory,
      namespace,
      String(resourceId),
    );
    const now = new Date();
    const date = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;
    const uploadDirectory = `${basePath}/${date}`;

    return this.withSftp(async (sftp) => {
      const exists = await sftp.exists(uploadDirectory);
      if (!exists) {
        await sftp.mkdir(uploadDirectory, true);
      }

      const attachments: UploadedAttachment[] = [];
      for (const file of files) {
        const extension = this.getExtension(file.originalname);
        const uuid = `${uuidv4()}${extension ? '.' + extension : ''}`;
        const path = `${uploadDirectory}/${uuid}`;
        const originalname = Buffer.from(file.originalname, 'latin1').toString(
          'utf8',
        );

        await sftp.put(file.buffer, path);

        attachments.push({
          filename: originalname,
          size: file.size,
          path,
          url: `${this.configService.sftp.url}${path}`,
        });
      }

      return attachments;
    });
  }

  async uploadSupplierLogo(user: User, file: Express.Multer.File) {
    assertWriteAccess(user);
    assertAdmin(user);

    const directory = 'suppliers';
    const basePath = `${this.configService.sftp.path}/${directory}`;

    const extension = this.getExtension(file.originalname);
    const uuid = `${uuidv4()}${extension ? '.' + extension : ''}`;
    const path = `${basePath}/${uuid}`;

    await this.uploadFile(file.buffer, path);

    return {
      filename: file.originalname,
      size: file.size,
      url: `${this.configService.sftp.url}${path}`,
    };
  }
}

import {
  ForbiddenException,
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

@Injectable()
export class SftpService {
  constructor(
    @Inject(config.KEY)
    private readonly configService: ConfigType<typeof config>,
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
      throw new InternalServerErrorException('sftp_connection_failed');
    } finally {
      try {
        await sftp.end();
      } catch (err) {
        // 무시: Windows에서 발생하는 ECONNRESET 방지
      }
    }
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

  async downloadFile(path: string) {
    return this.withSftp(async (sftp) => {
      const exists = await sftp.exists(path);
      if (!exists) {
        throw new NotFoundException('file_not_found');
      }

      const buffer = (await sftp.get(path)) as Buffer;
      const filename = path.substring(path.lastIndexOf('/') + 1);

      return { buffer, filename };
    });
  }

  async deleteFileByUrl(url: string) {
    const baseUrl = this.configService.sftp.url;

    if (!url.startsWith(baseUrl)) {
      throw new InternalServerErrorException('invalid_sftp_url');
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
    path: string,
    files: Express.Multer.File[],
  ) {
    const directory = 'inline-images';
    const basePath = `${this.configService.sftp.path}/${directory}/${path}/${user.id}`;
    const date = `${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}`;

    const images = await Promise.all(
      files.map(async (file) => {
        const extension = this.getExtension(file.originalname);
        const uuid = `${uuidv4()}${extension ? '.' + extension : ''}`;
        const path = `${basePath}/${date}/${uuid}`;

        return await this.uploadFile(file.buffer, path);
      }),
    );

    return images.map((result) =>
      plainToInstance(UploadInlineImageDto, {
        path: result.path,
        url: result.url,
      }),
    );
  }

  async uploadAttachments(
    user: User,
    path: string,
    files: Express.Multer.File[],
  ) {
    const directory = 'attachments';
    const basePath = `${this.configService.sftp.path}/${directory}/${path}/${user.id}`;
    const date = `${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}`;

    const attachments = await Promise.all(
      files.map(async (file) => {
        const extension = this.getExtension(file.originalname);
        const uuid = `${uuidv4()}${extension ? '.' + extension : ''}`;
        const path = `${basePath}/${date}/${uuid}`;
        const originalname = Buffer.from(file.originalname, 'latin1').toString(
          'utf8',
        );

        await this.uploadFile(file.buffer, path);

        return {
          filename: originalname,
          size: file.size,
          path: path,
          url: `${this.configService.sftp.url}${path}`,
        };
      }),
    );

    return attachments;
  }

  async uploadSupplierLogo(user: User, file: Express.Multer.File) {
    if (!user.isAdmin) {
      throw new ForbiddenException('no_permission');
    }

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

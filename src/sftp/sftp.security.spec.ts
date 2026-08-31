import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { SftpService } from './sftp.service';
import { User } from '@/entity/user/user.entity';

describe('SFTP download security', () => {
  const documentAttachments = { findOne: jest.fn() };
  const issueAttachments = { findOne: jest.fn() };
  const reportAttachments = { findOne: jest.fn() };
  const service = new SftpService(
    { sftp: { path: '/srv/taskflow' } } as any,
    documentAttachments as any,
    issueAttachments as any,
    reportAttachments as any,
  );
  const authorizedUser = { id: 1, isAuthorized: true } as User;

  beforeEach(() => {
    jest.clearAllMocks();
    documentAttachments.findOne.mockResolvedValue(null);
    issueAttachments.findOne.mockResolvedValue(null);
    reportAttachments.findOne.mockResolvedValue(null);
  });

  it.each([
    '/etc/passwd',
    '/srv/taskflow/../secret.txt',
    '/srv/taskflow//attachments/file.txt',
    '\\srv\\taskflow\\attachments\\file.txt',
  ])(
    'rejects a path outside the canonical base directory: %s',
    async (path) => {
      await expect(service.downloadFile(authorizedUser, path)).rejects.toEqual(
        new BadRequestException('bad_request_sftp_path_invalid'),
      );
      expect(documentAttachments.findOne).not.toHaveBeenCalled();
    },
  );

  it('rejects a guessed path with no attachment record', async () => {
    const path = '/srv/taskflow/attachments/issue/1/guessed.txt';

    await expect(service.downloadFile(authorizedUser, path)).rejects.toEqual(
      new NotFoundException('not_found_attachment'),
    );
    expect(documentAttachments.findOne).toHaveBeenCalledWith({
      where: { path },
      relations: ['document'],
    });
  });

  it('rejects an attachment whose parent resource is unavailable', async () => {
    documentAttachments.findOne.mockResolvedValue({
      filename: 'orphan.txt',
      path: '/srv/taskflow/attachments/document/1/orphan.txt',
      document: null,
    });

    await expect(
      service.downloadFile(
        authorizedUser,
        '/srv/taskflow/attachments/document/1/orphan.txt',
      ),
    ).rejects.toEqual(new ForbiddenException('forbidden_access_denied'));
  });
});

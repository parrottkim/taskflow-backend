import { SftpService } from '@/sftp/sftp.service';

export type FileOperation = {
  type: 'delete-url' | 'delete-path' | 'archive-path';
  target: string;
};

type FileOperationClient = Pick<
  SftpService,
  'deleteFileByUrl' | 'deleteFileByPath' | 'archiveFileByPath'
>;

export async function executeFileOperations(
  client: FileOperationClient,
  operations: FileOperation[],
  context: string,
) {
  for (const operation of operations) {
    try {
      if (operation.type === 'delete-url') {
        await client.deleteFileByUrl(operation.target);
      } else if (operation.type === 'delete-path') {
        await client.deleteFileByPath(operation.target);
      } else {
        await client.archiveFileByPath(operation.target);
      }
    } catch (error) {
      console.warn(
        `${context} 파일 후처리 실패 (${operation.type}): ${operation.target}`,
        error,
      );
    }
  }
}

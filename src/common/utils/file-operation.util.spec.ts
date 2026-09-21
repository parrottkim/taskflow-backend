import { executeFileOperations } from './file-operation.util';

describe('executeFileOperations', () => {
  it('한 파일 작업이 실패해도 나머지 작업을 계속 실행한다', async () => {
    const client = {
      deleteFileByUrl: jest.fn().mockRejectedValue(new Error('failed')),
      deleteFileByPath: jest.fn().mockResolvedValue(undefined),
      archiveFileByPath: jest.fn().mockResolvedValue(undefined),
    };
    const warn = jest.spyOn(console, 'warn').mockImplementation();

    await executeFileOperations(
      client,
      [
        { type: 'delete-url', target: 'https://example.com/old.png' },
        { type: 'delete-path', target: '/reports/new.pdf' },
        { type: 'archive-path', target: '/reports/old.pdf' },
      ],
      '테스트',
    );

    expect(client.deleteFileByPath).toHaveBeenCalledWith('/reports/new.pdf');
    expect(client.archiveFileByPath).toHaveBeenCalledWith('/reports/old.pdf');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

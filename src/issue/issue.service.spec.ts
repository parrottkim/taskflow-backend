jest.mock('@/mail/mail.service', () => ({
  MailService: class {},
}));

import { IssueService } from './issue.service';
import { PaymentIssueService } from './payment/payment-issue.service';

function createQueryBuilder(result: unknown) {
  const queryBuilder = {
    leftJoinAndSelect: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    addOrderBy: jest.fn(),
    setLock: jest.fn(),
    getOne: jest.fn().mockResolvedValue(result),
  };

  for (const method of [
    queryBuilder.leftJoinAndSelect,
    queryBuilder.where,
    queryBuilder.orderBy,
    queryBuilder.addOrderBy,
    queryBuilder.setLock,
  ]) {
    method.mockReturnValue(queryBuilder);
  }

  return queryBuilder;
}

describe('IssueService', () => {
  describe('mapIssueToDto', () => {
    it('exposes the saved contract exchange rate on contract issues', async () => {
      const service = new IssueService(
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
      );
      const contract = {
        id: 30,
        contractDate: '2026-08-13',
        currency: { id: 2, code: 'USD', symbol: '$' },
        exchangeRate: {
          id: 40,
          rate: 1380.5,
          appliedDate: '2026-08-13',
        },
      };
      const manager = {
        findOne: jest.fn().mockResolvedValue(contract),
        find: jest.fn().mockResolvedValue([]),
      };

      const dto = await service.mapIssueToDto(
        {
          id: 10,
          project: { id: 20 },
          category: { id: 1, name: '계약' },
          createdBy: { id: 1 },
          updatedBy: { id: 1 },
          content: 'contract',
          attachments: [],
          createdAt: new Date('2026-08-13T00:00:00.000Z'),
          updatedAt: new Date('2026-08-13T00:00:00.000Z'),
        } as never,
        manager as never,
      );

      expect(dto).toMatchObject({
        contractDate: '2026-08-13',
        exchangeRate: {
          id: 40,
          rate: 1380.5,
          appliedDate: '2026-08-13',
        },
      });
    });
  });

  describe('getLatestIssues', () => {
    it('excludes issues without an active project and client', async () => {
      const queryBuilder = {
        innerJoinAndSelect: jest.fn(),
        leftJoinAndSelect: jest.fn(),
        orderBy: jest.fn(),
        skip: jest.fn(),
        take: jest.fn(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      for (const method of [
        queryBuilder.innerJoinAndSelect,
        queryBuilder.leftJoinAndSelect,
        queryBuilder.orderBy,
        queryBuilder.skip,
        queryBuilder.take,
      ]) {
        method.mockReturnValue(queryBuilder);
      }

      const issueRepository = {
        createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      };
      const service = new IssueService(
        {} as never,
        issueRepository as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
      );

      await service.getLatestIssues({ page: 1, limit: 20 });

      expect(queryBuilder.innerJoinAndSelect).toHaveBeenNthCalledWith(
        1,
        'issue.project',
        'project',
      );
      expect(queryBuilder.innerJoinAndSelect).toHaveBeenNthCalledWith(
        2,
        'project.client',
        'client',
      );
    });
  });

  describe('file cleanup', () => {
    it('deletes SFTP files only after the database commit and connection release', async () => {
      const events: string[] = [];
      const issue = {
        id: 10,
        project: { id: 20 },
        category: { id: 6 },
        createdBy: { id: 1 },
        updatedBy: { id: 1 },
        payment: { id: 30 },
        content: '![old](https://files.example/old.png)',
        attachments: [{ id: 40, path: '/issue/old.pdf' }],
      };
      const manager = {
        findOne: jest.fn().mockResolvedValue(issue),
        remove: jest.fn().mockImplementation(async () => {
          events.push('remove-attachment');
        }),
        save: jest.fn().mockImplementation(async () => {
          events.push('save-issue');
          return issue;
        }),
        create: jest.fn(),
      };
      const queryRunner = {
        manager,
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn().mockImplementation(async () => {
          events.push('commit');
        }),
        rollbackTransaction: jest.fn(),
        release: jest.fn().mockImplementation(async () => {
          events.push('release');
        }),
      };
      const dataSource = {
        createQueryRunner: jest.fn().mockReturnValue(queryRunner),
        manager: {
          findOne: jest.fn().mockResolvedValue(null),
          find: jest.fn().mockResolvedValue([]),
        },
      };
      const sftpService = {
        deleteFileByUrl: jest.fn().mockImplementation(async () => {
          events.push('delete-url');
        }),
        deleteFileByPath: jest.fn().mockImplementation(async () => {
          events.push('delete-path');
        }),
        archiveFileByPath: jest.fn(),
      };
      const issueService = new IssueService(
        dataSource as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        sftpService as never,
      );
      const service = new PaymentIssueService(
        dataSource as never,
        {} as never,
        issueService,
      );

      await service.updatePaymentIssue(
        { id: 1, isAdmin: false, isGuest: false } as never,
        issue.id,
        { content: 'updated', attachments: [] } as never,
      );

      expect(events).toEqual([
        'remove-attachment',
        'save-issue',
        'commit',
        'release',
        'delete-url',
        'delete-path',
      ]);
    });

    it('does not delete SFTP files when the database transaction rolls back', async () => {
      const issue = {
        id: 10,
        project: { id: 20 },
        category: { id: 6 },
        createdBy: { id: 1 },
        payment: { id: 30 },
        content: '![old](https://files.example/old.png)',
        attachments: [{ id: 40, path: '/issue/old.pdf' }],
      };
      const manager = {
        findOne: jest.fn().mockResolvedValue(issue),
        remove: jest.fn(),
        save: jest.fn().mockRejectedValue(new Error('save failed')),
        create: jest.fn(),
      };
      const queryRunner = {
        manager,
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
      };
      const sftpService = {
        deleteFileByUrl: jest.fn(),
        deleteFileByPath: jest.fn(),
        archiveFileByPath: jest.fn(),
      };
      const dataSource = {
        createQueryRunner: jest.fn().mockReturnValue(queryRunner),
      };
      const issueService = new IssueService(
        dataSource as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        sftpService as never,
      );
      const service = new PaymentIssueService(
        dataSource as never,
        {} as never,
        issueService,
      );

      await expect(
        service.updatePaymentIssue(
          { id: 1, isAdmin: false, isGuest: false } as never,
          issue.id,
          { content: 'updated', attachments: [] } as never,
        ),
      ).rejects.toThrow('save failed');

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(sftpService.deleteFileByUrl).not.toHaveBeenCalled();
      expect(sftpService.deleteFileByPath).not.toHaveBeenCalled();
    });
  });

  describe('deleteIssue', () => {
    it('uses the transaction manager and soft-deletes approval and procurement request rows', async () => {
      const events: string[] = [];
      const issue = {
        id: 10,
        project: { id: 20 },
        category: { id: 4 },
        createdBy: { id: 1 },
        updatedBy: { id: 1 },
        content: 'content',
        attachments: [{ id: 30, path: '/issue/file.pdf' }],
        approval: { id: 40 },
        procurement: { id: 50, items: [], requests: [] },
      };
      const deleteQueryBuilder = createQueryBuilder(issue);
      const projectQueryBuilder = createQueryBuilder({
        id: issue.project.id,
        latestCategory: issue.category,
      });
      const latestIssueQueryBuilder = createQueryBuilder(null);
      let issueQueryCount = 0;

      const manager = {
        createQueryBuilder: jest.fn().mockImplementation((entity) => {
          if (entity.name === 'Project') return projectQueryBuilder;
          if (entity.name === 'Issue' && issueQueryCount++ === 0) {
            return deleteQueryBuilder;
          }
          return latestIssueQueryBuilder;
        }),
        findOne: jest.fn().mockResolvedValue(null),
        find: jest.fn().mockImplementation(async (entity) => {
          if (entity.name === 'ProcurementIssueRequest') {
            return [{ id: 60, items: [{ id: 70 }, { id: 71 }] }];
          }
          return [];
        }),
        softDelete: jest.fn().mockImplementation(async (entity) => {
          events.push(`soft-delete-${entity.name}`);
        }),
        save: jest.fn(),
      };
      const queryRunner = {
        manager,
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn().mockImplementation(async () => {
          events.push('commit');
        }),
        rollbackTransaction: jest.fn(),
        release: jest.fn().mockImplementation(async () => {
          events.push('release');
        }),
      };
      const issueRepository = { createQueryBuilder: jest.fn() };
      const sftpService = {
        deleteFileByUrl: jest.fn(),
        deleteFileByPath: jest.fn(),
        archiveFileByPath: jest.fn().mockImplementation(async () => {
          events.push('archive-path');
        }),
      };
      const service = new IssueService(
        { createQueryRunner: jest.fn().mockReturnValue(queryRunner) } as never,
        issueRepository as never,
        {} as never,
        {} as never,
        {} as never,
        sftpService as never,
      );

      await service.deleteIssue(
        { id: 1, isAdmin: false, isGuest: false } as never,
        issue.id,
      );

      expect(issueRepository.createQueryBuilder).not.toHaveBeenCalled();
      expect(deleteQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'issue.approval',
        'approval',
      );
      expect(
        manager.softDelete.mock.calls.map(([entity]) => entity.name),
      ).toEqual(
        expect.arrayContaining([
          'ApprovalIssue',
          'ProcurementIssueRequestItem',
          'ProcurementIssueRequest',
        ]),
      );
      expect(events.indexOf('archive-path')).toBeGreaterThan(
        events.indexOf('release'),
      );
    });
  });
});

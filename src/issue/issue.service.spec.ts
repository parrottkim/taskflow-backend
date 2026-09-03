jest.mock('@/mail/mail.service', () => ({
  MailService: class {},
}));

import { IssueService } from './issue.service';

describe('IssueService', () => {
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
        {} as never,
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
});

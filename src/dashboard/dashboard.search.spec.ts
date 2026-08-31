import { DashboardService } from './dashboard.service';
import { DashboardSearchItemType } from './dto/search';

function createQueryBuilder(items: unknown[], total: number) {
  const queryBuilder = {
    leftJoinAndSelect: jest.fn(),
    where: jest.fn(),
    addSelect: jest.fn(),
    orderBy: jest.fn(),
    addOrderBy: jest.fn(),
    setParameters: jest.fn(),
    take: jest.fn(),
    getManyAndCount: jest.fn().mockResolvedValue([items, total]),
  };

  for (const method of [
    'leftJoinAndSelect',
    'where',
    'addSelect',
    'orderBy',
    'addOrderBy',
    'setParameters',
    'take',
  ] as const) {
    queryBuilder[method].mockReturnValue(queryBuilder);
  }

  return queryBuilder;
}

describe('DashboardService search', () => {
  it('returns grouped results with navigation metadata', async () => {
    const updatedAt = new Date('2026-08-06T00:00:00.000Z');
    const projectQuery = createQueryBuilder(
      [
        {
          id: 1,
          code: 'P-001',
          name: '통합 프로젝트',
          client: { name: '고객사' },
          updatedAt,
        },
      ],
      2,
    );
    const documentQuery = createQueryBuilder(
      [
        {
          id: 2,
          title: '통합 문서',
          folder: { id: 20, name: '공지' },
          updatedAt,
        },
      ],
      3,
    );
    const scheduleQuery = createQueryBuilder(
      [
        {
          id: 3,
          summary: '통합 일정',
          project: { id: 1, code: 'P-001', name: '통합 프로젝트' },
          category: { id: 1, name: '국내' },
          start: new Date('2026-08-10T00:00:00.000Z'),
          end: new Date('2026-08-11T00:00:00.000Z'),
          updatedAt,
        },
      ],
      4,
    );
    const issueQuery = createQueryBuilder(
      [
        {
          id: 4,
          project: { id: 1, code: 'P-001', name: '통합 프로젝트' },
          category: { id: 4, name: '조달' },
          updatedAt,
        },
      ],
      5,
    );
    const reportQuery = createQueryBuilder(
      [
        {
          id: 5,
          project: { id: 1, code: 'P-001', name: '통합 프로젝트' },
          schedule: {
            summary: '통합 일정',
            category: { id: 1, name: '국내' },
          },
          updatedAt,
        },
      ],
      6,
    );

    const service = new DashboardService(
      { createQueryBuilder: jest.fn().mockReturnValue(projectQuery) } as never,
      {
        createQueryBuilder: jest.fn().mockReturnValue(scheduleQuery),
      } as never,
      {
        createQueryBuilder: jest.fn().mockReturnValue(documentQuery),
      } as never,
      { createQueryBuilder: jest.fn().mockReturnValue(issueQuery) } as never,
      { createQueryBuilder: jest.fn().mockReturnValue(reportQuery) } as never,
      {} as never,
    );

    const result = await service.search({ search: '통합', limit: 5 });

    expect(result.projects).toMatchObject({ total: 2 });
    expect(result.projects.items[0]).toMatchObject({
      type: DashboardSearchItemType.Project,
      id: 1,
      projectId: 1,
      projectCode: 'P-001',
    });
    expect(result.documents.items[0]).toMatchObject({
      type: DashboardSearchItemType.Document,
      folderId: 20,
      folderName: '공지',
    });
    expect(result.schedules.items[0]).toMatchObject({
      type: DashboardSearchItemType.Schedule,
      categoryId: 1,
    });
    expect(result.issues.items[0]).toMatchObject({
      type: DashboardSearchItemType.Issue,
      categoryType: 'procurement',
    });
    expect(result.reports.items[0]).toMatchObject({
      type: DashboardSearchItemType.Report,
      categoryName: '국내',
    });

    for (const queryBuilder of [
      projectQuery,
      documentQuery,
      scheduleQuery,
      issueQuery,
      reportQuery,
    ]) {
      expect(queryBuilder.take).toHaveBeenCalledWith(5);
      expect(queryBuilder.getManyAndCount).toHaveBeenCalledTimes(1);
    }

    expect(projectQuery.orderBy).toHaveBeenCalledWith(
      'project_relevance',
      'ASC',
    );
    expect(documentQuery.orderBy).toHaveBeenCalledWith(
      'document_relevance',
      'ASC',
    );
    expect(scheduleQuery.orderBy).toHaveBeenCalledWith(
      'schedule_relevance',
      'ASC',
    );
    expect(issueQuery.orderBy).toHaveBeenCalledWith('issue_relevance', 'ASC');
    expect(reportQuery.orderBy).toHaveBeenCalledWith('report_relevance', 'ASC');
  });
});

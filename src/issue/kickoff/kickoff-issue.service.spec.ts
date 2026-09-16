jest.mock('@/mail/mail.service', () => ({
  MailService: class {},
}));

import { KickoffIssueParticipantItem } from '@/entity/issue/kickoff/kickoff-issue-participant-item.entity';
import { KickoffIssueTripItemCategory } from '@/entity/issue/kickoff/kickoff-issue-trip-item-category.entity';
import { KickoffIssueTripItem } from '@/entity/issue/kickoff/kickoff-issue-trip-item.entity';
import { KickoffIssue } from '@/entity/issue/kickoff/kickoff-issue.entity';
import { Issue } from '@/entity/issue/issue.entity';
import { User } from '@/entity/user/user.entity';
import { KickoffIssueService } from './kickoff-issue.service';

describe('KickoffIssueService', () => {
  const user = { id: 1, isAdmin: false, isGuest: false };
  const project = { id: 10 };
  const issueCategory = { id: 2 };

  it('returns trip categories ordered by id', async () => {
    const categories = [
      { id: 1, name: 'domestic' },
      { id: 2, name: 'overseas' },
    ];
    const tripCategoryRepository = {
      find: jest.fn().mockResolvedValue(categories),
    };
    const service = new KickoffIssueService(
      {} as never,
      {} as never,
      tripCategoryRepository as never,
      {} as never,
    );

    await expect(service.getAllTripCategories()).resolves.toEqual(categories);
    expect(tripCategoryRepository.find).toHaveBeenCalledWith({
      order: { id: 'ASC' },
    });
  });

  it('creates participant and trip items in the kickoff transaction', async () => {
    const participant = { id: 20, username: 'participant' };
    const tripCategory = { id: 30, name: 'domestic' };
    const manager = {
      findOne: jest.fn().mockImplementation(async (entity) => {
        if (entity === KickoffIssue) return null;
        if (entity === User) return participant;
        if (entity === KickoffIssueTripItemCategory) return tripCategory;
        return null;
      }),
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation((entity, value) => ({
        ...value,
        ...(entity === Issue ? { id: 40 } : {}),
        ...(entity === KickoffIssue ? { id: 50 } : {}),
      })),
      save: jest.fn().mockImplementation(async (value) => value),
      softDelete: jest.fn(),
    };
    const queryRunner = {
      manager,
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
    };
    const issueService = {
      findAndLockProject: jest.fn().mockResolvedValue(project),
      findIssueCategory: jest.fn().mockResolvedValue(issueCategory),
      advanceLatestCategory: jest.fn(),
      mapIssueToDto: jest.fn().mockResolvedValue({ id: 40 }),
    };
    const service = new KickoffIssueService(
      { createQueryRunner: () => queryRunner } as never,
      {} as never,
      {} as never,
      issueService as never,
    );

    await service.createKickoffIssue(user as never, {
      projectId: project.id,
      categoryId: issueCategory.id,
      content: 'kickoff',
      kickoffDate: new Date('2026-09-04'),
      participantItems: [{ participantId: participant.id, role: 'PM' }],
      tripItems: [{ categoryId: tripCategory.id, days: 3, note: 'note' }],
      attachments: [],
    });

    expect(manager.create).toHaveBeenCalledWith(
      KickoffIssueParticipantItem,
      expect.objectContaining({
        kickoff: expect.objectContaining({ id: 50 }),
        participant,
        role: 'PM',
      }),
    );
    expect(manager.create).toHaveBeenCalledWith(
      KickoffIssueTripItem,
      expect.objectContaining({
        kickoff: expect.objectContaining({ id: 50 }),
        category: tripCategory,
        days: 3,
        note: 'note',
      }),
    );
    expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
    expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
    expect(issueService.advanceLatestCategory).toHaveBeenCalledWith(
      manager,
      project,
      issueCategory,
    );
  });

  it('synchronizes kickoff items and soft-deletes omitted rows', async () => {
    const originalParticipant = { id: 20 };
    const newParticipant = { id: 21 };
    const originalTripCategory = { id: 30 };
    const newTripCategory = { id: 31 };
    const existingParticipant = {
      id: 100,
      participant: originalParticipant,
      role: 'old',
    };
    const removedParticipant = {
      id: 101,
      participant: { id: 22 },
      role: 'remove',
    };
    const existingTrip = {
      id: 200,
      category: originalTripCategory,
      days: 1,
      note: null,
    };
    const removedTrip = {
      id: 201,
      category: { id: 32 },
      days: 2,
      note: null,
    };
    const issue = {
      id: 40,
      project,
      category: issueCategory,
      createdBy: user,
      kickoff: { id: 50 },
      attachments: [],
      content: 'kickoff',
    };
    const manager = {
      findOne: jest.fn().mockImplementation(async (entity, options) => {
        if (entity === Issue) return issue;
        if (entity === User && options.where.id === newParticipant.id) {
          return newParticipant;
        }
        if (
          entity === KickoffIssueTripItemCategory &&
          options.where.id === newTripCategory.id
        ) {
          return newTripCategory;
        }
        return null;
      }),
      find: jest.fn().mockImplementation(async (entity) => {
        if (entity === KickoffIssueParticipantItem) {
          return [existingParticipant, removedParticipant];
        }
        if (entity === KickoffIssueTripItem) {
          return [existingTrip, removedTrip];
        }
        return [];
      }),
      create: jest.fn().mockImplementation((_entity, value) => value),
      save: jest.fn().mockImplementation(async (value) => value),
      softDelete: jest.fn(),
    };
    const queryRunner = {
      manager,
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
    };
    const issueService = {
      applyCommonIssueUpdate: jest.fn().mockResolvedValue([]),
      executeFileOperations: jest.fn(),
      mapIssueToDto: jest.fn().mockResolvedValue({ id: issue.id }),
    };
    const service = new KickoffIssueService(
      { createQueryRunner: () => queryRunner } as never,
      {} as never,
      {} as never,
      issueService as never,
    );

    await service.updateKickoffIssue(user as never, issue.id, {
      participantItems: [
        { id: existingParticipant.id, role: 'changed' },
        { participantId: newParticipant.id, role: 'new' },
      ],
      tripItems: [
        { id: existingTrip.id, days: 5 },
        { categoryId: newTripCategory.id, days: 2 },
      ],
    });

    expect(existingParticipant).toEqual(
      expect.objectContaining({
        participant: originalParticipant,
        role: 'changed',
      }),
    );
    expect(existingTrip).toEqual(
      expect.objectContaining({
        category: originalTripCategory,
        days: 5,
      }),
    );
    expect(manager.softDelete).toHaveBeenCalledWith(
      KickoffIssueParticipantItem,
      [removedParticipant.id],
    );
    expect(manager.softDelete).toHaveBeenCalledWith(KickoffIssueTripItem, [
      removedTrip.id,
    ]);
    expect(manager.create).toHaveBeenCalledWith(
      KickoffIssueParticipantItem,
      expect.objectContaining({ participant: newParticipant, role: 'new' }),
    );
    expect(manager.create).toHaveBeenCalledWith(
      KickoffIssueTripItem,
      expect.objectContaining({ category: newTripCategory, days: 2 }),
    );
    expect(manager.findOne).toHaveBeenCalledWith(
      Issue,
      expect.objectContaining({
        relations: expect.arrayContaining([
          'kickoff.participantItems.participant',
          'kickoff.tripItems.category',
        ]),
      }),
    );
    expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
    expect(issueService.executeFileOperations).toHaveBeenCalledWith([]);
  });
});

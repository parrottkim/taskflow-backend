import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Issue } from '@/entity/issue/issue.entity';
import { KickoffIssue } from '@/entity/issue/kickoff/kickoff-issue.entity';
import { KickoffIssueParticipantItem } from '@/entity/issue/kickoff/kickoff-issue-participant-item.entity';
import { KickoffIssueTripItem } from '@/entity/issue/kickoff/kickoff-issue-trip-item.entity';
import { KickoffIssueTripItemCategory } from '@/entity/issue/kickoff/kickoff-issue-trip-item-category.entity';
import { User } from '@/entity/user/user.entity';
import { assertOwnerOrAdmin } from '@/common/policies/resource-access.policy';
import { assertWriteAccess } from '@/common/policies/write-access.policy';
import { CreateKickoffIssueDto } from '../dto/create-issue';
import { KickoffIssueDto, KickoffIssueTripItemCategoryDto } from '../dto/issue';
import { UpdateKickoffIssueDto } from '../dto/update-issue';
import { IssueFileOperation, IssueService } from '../issue.service';

@Injectable()
export class KickoffIssueService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Issue)
    private readonly issueRepository: Repository<Issue>,
    @InjectRepository(KickoffIssueTripItemCategory)
    private readonly tripCategoryRepository: Repository<KickoffIssueTripItemCategory>,
    private readonly issueService: IssueService,
  ) {}

  async getAllTripCategories() {
    const categories = await this.tripCategoryRepository.find({
      order: { id: 'ASC' },
    });

    return plainToInstance(KickoffIssueTripItemCategoryDto, categories, {
      excludeExtraneousValues: true,
    });
  }

  private async findParticipant(manager: EntityManager, id: number) {
    const participant = await manager.findOne(User, { where: { id } });
    if (!participant) throw new NotFoundException('not_found_user');
    return participant;
  }

  private async findTripCategory(manager: EntityManager, id: number) {
    const category = await manager.findOne(KickoffIssueTripItemCategory, {
      where: { id },
    });
    if (!category) throw new NotFoundException('not_found_category');
    return category;
  }

  private assertUniqueItemIds(items: { id?: number }[]) {
    const ids = items
      .map((item) => item.id)
      .filter((id): id is number => id !== undefined);

    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('duplicate_kickoff_item_id');
    }
  }

  private async syncParticipantItems(
    manager: EntityManager,
    kickoff: KickoffIssue,
    incomingItems: {
      id?: number;
      participantId?: number;
      role?: string;
    }[],
  ) {
    this.assertUniqueItemIds(incomingItems);

    const existingItems = await manager.find(KickoffIssueParticipantItem, {
      where: { kickoff: { id: kickoff.id } },
      relations: ['participant'],
    });
    const incomingIds = new Set(
      incomingItems
        .map((item) => item.id)
        .filter((id): id is number => id !== undefined),
    );
    const toRemove = existingItems.filter((item) => !incomingIds.has(item.id));

    if (toRemove.length > 0) {
      await manager.softDelete(
        KickoffIssueParticipantItem,
        toRemove.map((item) => item.id),
      );
    }

    const items = await Promise.all(
      incomingItems.map(async (dto) => {
        const existing =
          dto.id !== undefined
            ? existingItems.find((item) => item.id === dto.id)
            : undefined;

        if (dto.id !== undefined && !existing) {
          throw new NotFoundException('not_found_kickoff_participant_item');
        }

        const participantId = dto.participantId ?? existing?.participant?.id;
        const role = dto.role ?? existing?.role;
        if (participantId === undefined || role === undefined) {
          throw new BadRequestException('invalid_kickoff_participant_item');
        }

        const participant =
          dto.participantId !== undefined || !existing?.participant
            ? await this.findParticipant(manager, participantId)
            : existing.participant;

        if (existing) {
          existing.participant = participant;
          existing.role = role;
          return existing;
        }

        return manager.create(KickoffIssueParticipantItem, {
          kickoff,
          participant,
          role,
        });
      }),
    );

    return items.length > 0 ? manager.save(items) : [];
  }

  private async syncTripItems(
    manager: EntityManager,
    kickoff: KickoffIssue,
    incomingItems: {
      id?: number;
      categoryId?: number;
      days?: number;
      note?: string;
    }[],
  ) {
    this.assertUniqueItemIds(incomingItems);

    const existingItems = await manager.find(KickoffIssueTripItem, {
      where: { kickoff: { id: kickoff.id } },
      relations: ['category'],
    });
    const incomingIds = new Set(
      incomingItems
        .map((item) => item.id)
        .filter((id): id is number => id !== undefined),
    );
    const toRemove = existingItems.filter((item) => !incomingIds.has(item.id));

    if (toRemove.length > 0) {
      await manager.softDelete(
        KickoffIssueTripItem,
        toRemove.map((item) => item.id),
      );
    }

    const items = await Promise.all(
      incomingItems.map(async (dto) => {
        const existing =
          dto.id !== undefined
            ? existingItems.find((item) => item.id === dto.id)
            : undefined;

        if (dto.id !== undefined && !existing) {
          throw new NotFoundException('not_found_kickoff_trip_item');
        }

        const categoryId = dto.categoryId ?? existing?.category?.id;
        const days = dto.days ?? existing?.days;
        if (categoryId === undefined || days === undefined) {
          throw new BadRequestException('invalid_kickoff_trip_item');
        }

        const category =
          dto.categoryId !== undefined || !existing?.category
            ? await this.findTripCategory(manager, categoryId)
            : existing.category;
        const note = dto.note !== undefined ? dto.note : existing?.note;

        if (existing) {
          existing.category = category;
          existing.days = days;
          existing.note = note;
          return existing;
        }

        return manager.create(KickoffIssueTripItem, {
          kickoff,
          category,
          days,
          note: note ?? null,
        });
      }),
    );

    return items.length > 0 ? manager.save(items) : [];
  }

  async getKickoffIssue(id: number) {
    const issue = await this.issueRepository
      .createQueryBuilder('issue')
      .leftJoinAndSelect('issue.project', 'project')
      .leftJoinAndSelect('issue.category', 'category')
      .leftJoinAndSelect('issue.createdBy', 'createdBy')
      .leftJoinAndSelect('issue.updatedBy', 'updatedBy')
      .leftJoinAndSelect('createdBy.rank', 'rank')
      .leftJoinAndSelect('createdBy.department', 'department')
      .leftJoinAndSelect('updatedBy.rank', 'updatedByRank')
      .leftJoinAndSelect('updatedBy.department', 'updatedByDepartment')
      .leftJoinAndSelect('issue.attachments', 'attachment')
      .innerJoinAndSelect('issue.kickoff', 'kickoff')
      .leftJoinAndSelect('kickoff.participantItems', 'participantItem')
      .leftJoinAndSelect('participantItem.participant', 'participant')
      .leftJoinAndSelect('participant.rank', 'participantRank')
      .leftJoinAndSelect('participant.department', 'participantDepartment')
      .leftJoinAndSelect('kickoff.tripItems', 'tripItem')
      .leftJoinAndSelect('tripItem.category', 'tripItemCategory')
      .where('project.id = :id', { id })
      .addOrderBy('attachment.createdAt', 'DESC')
      .addOrderBy('participantItem.createdAt', 'ASC')
      .addOrderBy('tripItem.createdAt', 'ASC')
      .getOne();

    if (!issue) return null;

    const issueDto = plainToInstance(
      KickoffIssueDto,
      {
        ...issue,
        kickoffDate: issue.kickoff.kickoffDate,
        participantItems: issue.kickoff.participantItems ?? [],
        tripItems: issue.kickoff.tripItems ?? [],
      },
      {
        excludeExtraneousValues: true,
      },
    );

    return issueDto;
  }

  async createKickoffIssue(user: User, body: CreateKickoffIssueDto) {
    assertWriteAccess(user);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const project = await this.issueService.findAndLockProject(
        queryRunner.manager,
        body.projectId,
      );

      const category = await this.issueService.findIssueCategory(
        queryRunner.manager,
        body.categoryId,
        2,
      );

      const existingKickoff = await queryRunner.manager.findOne(KickoffIssue, {
        where: {
          project: { id: body.projectId },
        },
      });
      if (existingKickoff) {
        throw new ConflictException('conflict_kickoff_issue_already_exists');
      }

      const issue = await queryRunner.manager.create(Issue, {
        project,
        category,
        createdBy: user,
        updatedBy: user,
        content: body.content,
      });
      const savedIssue = await queryRunner.manager.save(issue);

      const kickoff = await queryRunner.manager.create(KickoffIssue, {
        issue: savedIssue,
        project,
        kickoffDate: body.kickoffDate,
      });
      const savedKickoff = await queryRunner.manager.save(kickoff);
      savedIssue.kickoff = savedKickoff;

      savedKickoff.participantItems = await this.syncParticipantItems(
        queryRunner.manager,
        savedKickoff,
        body.participantItems ?? [],
      );
      savedKickoff.tripItems = await this.syncTripItems(
        queryRunner.manager,
        savedKickoff,
        body.tripItems ?? [],
      );

      await this.issueService.advanceLatestCategory(
        queryRunner.manager,
        project,
        category,
      );

      await queryRunner.commitTransaction();
      return await this.issueService.mapIssueToDto(savedIssue);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async updateKickoffIssue(
    user: User,
    id: number,
    body: UpdateKickoffIssueDto,
  ) {
    assertWriteAccess(user);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let saved: Issue;
    let fileOperations: IssueFileOperation[] = [];

    try {
      const issue = await queryRunner.manager.findOne(Issue, {
        where: { id },
        relations: [
          'project',
          'createdBy',
          'category',
          'kickoff',
          'kickoff.participantItems',
          'kickoff.participantItems.participant',
          'kickoff.tripItems',
          'kickoff.tripItems.category',
          'attachments',
        ],
      });
      if (!issue) throw new NotFoundException('not_found_issue');
      if (!issue.kickoff) {
        throw new NotFoundException('not_found_kickoff_issue');
      }

      assertOwnerOrAdmin(user, issue.createdBy.id);

      if (body.kickoffDate !== undefined) {
        issue.kickoff.kickoffDate = body.kickoffDate;
        await queryRunner.manager.save(issue.kickoff);
      }

      if (body.participantItems !== undefined) {
        issue.kickoff.participantItems = await this.syncParticipantItems(
          queryRunner.manager,
          issue.kickoff,
          body.participantItems,
        );
      }

      if (body.tripItems !== undefined) {
        issue.kickoff.tripItems = await this.syncTripItems(
          queryRunner.manager,
          issue.kickoff,
          body.tripItems,
        );
      }

      fileOperations = await this.issueService.applyCommonIssueUpdate(
        queryRunner.manager,
        issue,
        body,
      );

      issue.updatedBy = user;
      saved = await queryRunner.manager.save(issue);

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }

    await this.issueService.executeFileOperations(fileOperations);
    return await this.issueService.mapIssueToDto(saved);
  }
}

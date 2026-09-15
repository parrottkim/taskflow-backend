import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { DataSource, Repository } from 'typeorm';
import { Issue } from '@/entity/issue/issue.entity';
import { KickoffIssue } from '@/entity/issue/kickoff/kickoff-issue.entity';
import { User } from '@/entity/user/user.entity';
import { assertOwnerOrAdmin } from '@/common/policies/resource-access.policy';
import { assertWriteAccess } from '@/common/policies/write-access.policy';
import { CreateKickoffIssueDto } from '../dto/create-issue';
import { KickoffIssueDto } from '../dto/issue';
import { UpdateKickoffIssueDto } from '../dto/update-issue';
import { IssueFileOperation, IssueService } from '../issue.service';

@Injectable()
export class KickoffIssueService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Issue)
    private readonly issueRepository: Repository<Issue>,
    private readonly issueService: IssueService,
  ) {}

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
      .where('project.id = :id', { id })
      .addOrderBy('attachment.createdAt', 'DESC')
      .getOne();

    if (!issue) return null;

    const issueDto = plainToInstance(
      KickoffIssueDto,
      { ...issue, kickoffDate: issue.kickoff.kickoffDate },
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

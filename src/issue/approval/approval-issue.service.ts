import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { DataSource, Repository } from 'typeorm';
import { ApprovalIssue } from '@/entity/issue/approval/approval-issue.entity';
import { Issue } from '@/entity/issue/issue.entity';
import { User } from '@/entity/user/user.entity';
import { assertOwnerOrAdmin } from '@/common/policies/resource-access.policy';
import { assertWriteAccess } from '@/common/policies/write-access.policy';
import { CreateApprovalIssueDto } from '../dto/create-issue';
import { GetIssuesDto } from '../dto/get-issues';
import { ApprovalIssueDto, IssueListDto } from '../dto/issue';
import { UpdateApprovalIssueDto } from '../dto/update-issue';
import { IssueFileOperation, IssueService } from '../issue.service';

@Injectable()
export class ApprovalIssueService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Issue)
    private readonly issueRepository: Repository<Issue>,
    private readonly issueService: IssueService,
  ) {}

  async getApprovalIssues(value: GetIssuesDto) {
    const [issues, total] = await this.issueRepository
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
      .innerJoinAndSelect('issue.approval', 'approval')
      .where('project.id = :id', { id: value.projectId })
      .orderBy('issue.createdAt', 'DESC')
      .addOrderBy('attachment.createdAt', 'DESC')
      .skip((value.page - 1) * value.limit)
      .take(value.limit)
      .getManyAndCount();

    const items = plainToInstance(ApprovalIssueDto, issues, {
      excludeExtraneousValues: true,
    });

    return plainToInstance(
      IssueListDto,
      {
        items: items,
        page: value.page,
        total,
      },
      {
        excludeExtraneousValues: true,
      },
    );
  }

  async createApprovalIssue(user: User, body: CreateApprovalIssueDto) {
    assertWriteAccess(user);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const project = await this.issueService.findAndLockProject(
        queryRunner.manager,
        body.projectId,
      );

      // 2️⃣ 카테고리 조회
      const category = await this.issueService.findIssueCategory(
        queryRunner.manager,
        body.categoryId,
        3,
      );

      const issue = await queryRunner.manager.create(Issue, {
        project,
        category,
        createdBy: user,
        updatedBy: user,
        content: body.content,
      });
      const savedIssue = await queryRunner.manager.save(issue);

      const approval = await queryRunner.manager.create(ApprovalIssue, {
        issue: savedIssue,
        project,
      });
      const savedApproval = await queryRunner.manager.save(approval);
      savedIssue.approval = savedApproval;

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

  async updateApprovalIssue(
    user: User,
    id: number,
    body: UpdateApprovalIssueDto,
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
          'approval',
          'attachments',
        ],
      });
      if (!issue) throw new NotFoundException('not_found_issue');

      assertOwnerOrAdmin(user, issue.createdBy.id);

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

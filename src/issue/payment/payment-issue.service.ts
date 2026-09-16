import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { DataSource, Repository } from 'typeorm';
import { Issue } from '@/entity/issue/issue.entity';
import { PaymentIssue } from '@/entity/issue/payment/payment-issue.entity';
import { User } from '@/entity/user/user.entity';
import { assertOwnerOrAdmin } from '@/common/policies/resource-access.policy';
import { assertWriteAccess } from '@/common/policies/write-access.policy';
import { CreatePaymentIssueDto } from '../dto/create-issue';
import { PaymentIssueDto } from '../dto/issue';
import { UpdatePaymentIssueDto } from '../dto/update-issue';
import { IssueFileOperation, IssueService } from '../issue.service';

@Injectable()
export class PaymentIssueService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Issue)
    private readonly issueRepository: Repository<Issue>,
    private readonly issueService: IssueService,
  ) {}

  async getPaymentIssue(id: number) {
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
      .innerJoinAndSelect('issue.payment', 'payment')
      .where('project.id = :id', { id })
      .addOrderBy('attachment.createdAt', 'DESC')
      .getOne();

    if (!issue) return null;

    const issueDto = plainToInstance(PaymentIssueDto, issue, {
      excludeExtraneousValues: true,
    });

    return issueDto;
  }

  async createPaymentIssue(user: User, body: CreatePaymentIssueDto) {
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
        6,
      );

      const existingPayment = await queryRunner.manager.findOne(PaymentIssue, {
        where: {
          project: { id: body.projectId },
        },
      });
      if (existingPayment) {
        throw new ConflictException('conflict_payment_issue_already_exists');
      }

      const issue = await queryRunner.manager.create(Issue, {
        project,
        category,
        createdBy: user,
        updatedBy: user,
        content: body.content,
      });
      const savedIssue = await queryRunner.manager.save(issue);

      const payment = await queryRunner.manager.create(PaymentIssue, {
        issue: savedIssue,
        project,
      });
      const savedPayment = await queryRunner.manager.save(payment);
      savedIssue.payment = savedPayment;

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

  async updatePaymentIssue(
    user: User,
    id: number,
    body: UpdatePaymentIssueDto,
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
          'payment',
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

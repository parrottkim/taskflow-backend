import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { DataSource, Repository } from 'typeorm';
import { ContractIssue } from '@/entity/issue/contract/contract-issue.entity';
import { Issue } from '@/entity/issue/issue.entity';
import { TransactionIssueItemCategory } from '@/entity/issue/transaction/transaction-issue-category.entity';
import { TransactionIssueItem } from '@/entity/issue/transaction/transaction-issue-item.entity';
import { TransactionIssue } from '@/entity/issue/transaction/transaction-issue.entity';
import { User } from '@/entity/user/user.entity';
import { assertOwnerOrAdmin } from '@/common/policies/resource-access.policy';
import { assertWriteAccess } from '@/common/policies/write-access.policy';
import { CreateTransactionIssueDto } from '../dto/create-issue';
import { TransactionIssueDto, TransactionIssueItemDto } from '../dto/issue';
import { UpdateTransactionIssueDto } from '../dto/update-issue';
import { IssueFileOperation, IssueService } from '../issue.service';
import dayjs from 'dayjs';

@Injectable()
export class TransactionIssueService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Issue)
    private readonly issueRepository: Repository<Issue>,
    @InjectRepository(TransactionIssueItem)
    private readonly transactionIssueItemRepository: Repository<TransactionIssueItem>,
    @InjectRepository(TransactionIssueItemCategory)
    private readonly transactionCategoryRepository: Repository<TransactionIssueItemCategory>,
    private readonly issueService: IssueService,
  ) {}

  async getAllTransactionCategories() {
    return await this.transactionCategoryRepository.find();
  }

  async getTransactionCategory(id: number) {
    const category = await this.transactionCategoryRepository.findOne({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('not_found_category');
    }

    return category;
  }

  async getTransactionItems(id: number) {
    const items = await this.transactionIssueItemRepository
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.project', 'project')
      .leftJoinAndSelect('item.category', 'category')
      .where('project.id = :id', { id })
      .andWhere('item.deletedAt IS NULL')
      .orderBy('item.createdAt', 'ASC')
      .getMany();

    return plainToInstance(TransactionIssueItemDto, items, {
      excludeExtraneousValues: true,
    });
  }

  async getTransactionIssue(id: number) {
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
      .innerJoinAndSelect('issue.transaction', 'transaction')
      .where('project.id = :id', { id })
      .addOrderBy('attachment.createdAt', 'DESC')
      .getOne();

    if (!issue) return null;

    const contract = await this.dataSource.manager.findOne(ContractIssue, {
      where: { project: { id: issue.project.id }, deletedAt: null },
      relations: ['currency'],
    });

    return plainToInstance(
      TransactionIssueDto,
      { ...issue, currency: contract?.currency },
      { excludeExtraneousValues: true },
    );
  }

  async createTransactionIssue(user: User, body: CreateTransactionIssueDto) {
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
        5,
      );

      const existingTransaction = await queryRunner.manager.findOne(
        TransactionIssue,
        {
          where: {
            project: { id: body.projectId },
          },
        },
      );
      if (existingTransaction) {
        throw new ConflictException(
          'conflict_transaction_issue_already_exists',
        );
      }

      const issue = await queryRunner.manager.create(Issue, {
        project,
        category,
        createdBy: user,
        updatedBy: user,
        content: body.content,
      });
      const savedIssue = await queryRunner.manager.save(issue);

      const transaction = await queryRunner.manager.create(TransactionIssue, {
        issue: savedIssue,
        project,
      });
      const savedTransaction = await queryRunner.manager.save(transaction);
      savedIssue.transaction = savedTransaction;

      const existingItems = await queryRunner.manager.find(
        TransactionIssueItem,
        { where: { project: { id: issue.project.id } } },
      );

      const toRemove = existingItems.filter(
        (e) => !body.transactionItems.some((dto) => dto.id === e.id),
      );
      if (toRemove.length) {
        await queryRunner.manager.softDelete(
          TransactionIssueItem,
          toRemove.map((item) => item.id),
        );
      }

      const items = await Promise.all(
        body.transactionItems.map(async (dto) => {
          const itemCategory = await queryRunner.manager.findOne(
            TransactionIssueItemCategory,
            { where: { id: dto.categoryId } },
          );
          const existing = dto.id
            ? existingItems.find((item) => item.id === dto.id)
            : undefined;
          if (existing) {
            existing.category = itemCategory;
            existing.price = dto.price;
            existing.ratio = dto.ratio;
            existing.isPaid = dto.isPaid;
            existing.paidAt = dto.paidAt ? dayjs(dto.paidAt).toDate() : null;
            existing.note = dto.note;
            return existing;
          }
          return queryRunner.manager.create(TransactionIssueItem, {
            project: issue.project,
            category: itemCategory,
            price: dto.price,
            ratio: dto.ratio,
            isPaid: dto.isPaid ?? false,
            paidAt: dto.paidAt ?? null,
            note: dto.note ?? null,
          });
        }),
      );
      await queryRunner.manager.save(items);

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

  async updateTransactionIssue(
    user: User,
    id: number,
    body: UpdateTransactionIssueDto,
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
          'transaction',
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

      if (body.transactionItems) {
        const existingItems = await queryRunner.manager.find(
          TransactionIssueItem,
          { where: { project: { id: issue.project.id } } },
        );

        const toRemove = existingItems.filter(
          (e) => !body.transactionItems.some((dto) => dto.id === e.id),
        );
        if (toRemove.length) {
          await queryRunner.manager.softDelete(
            TransactionIssueItem,
            toRemove.map((item) => item.id),
          );
        }

        const items = await Promise.all(
          body.transactionItems.map(async (dto) => {
            const itemCategory = await queryRunner.manager.findOne(
              TransactionIssueItemCategory,
              { where: { id: dto.categoryId } },
            );
            const existing = dto.id
              ? existingItems.find((item) => item.id === dto.id)
              : undefined;
            if (existing) {
              existing.category = itemCategory;
              existing.price = dto.price;
              existing.ratio = dto.ratio;
              existing.isPaid = dto.isPaid;
              existing.paidAt = dto.paidAt ? dayjs(dto.paidAt).toDate() : null;
              existing.note = dto.note;
              return existing;
            }
            return queryRunner.manager.create(TransactionIssueItem, {
              project: issue.project,
              category: itemCategory,
              price: dto.price,
              ratio: dto.ratio,
              isPaid: dto.isPaid ?? false,
              paidAt: dto.paidAt ?? null,
              note: dto.note ?? null,
            });
          }),
        );
        await queryRunner.manager.save(items);
      }

      // Issue 저장
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

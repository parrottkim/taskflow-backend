import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { DataSource, Repository } from 'typeorm';
import { Currency } from '@/entity/currency/currency.entity';
import { ContractIssueItem } from '@/entity/issue/contract/contract-issue-item.entity';
import { ContractIssue } from '@/entity/issue/contract/contract-issue.entity';
import { Issue } from '@/entity/issue/issue.entity';
import { TransactionIssueItemCategory } from '@/entity/issue/transaction/transaction-issue-category.entity';
import { TransactionIssueItem } from '@/entity/issue/transaction/transaction-issue-item.entity';
import { User } from '@/entity/user/user.entity';
import { assertOwnerOrAdmin } from '@/common/policies/resource-access.policy';
import { assertWriteAccess } from '@/common/policies/write-access.policy';
import { CreateContractIssueDto } from '../dto/create-issue';
import { UpdateContractIssueDto } from '../dto/update-issue';
import { ContractIssueItemDto } from '../dto/issue';
import { IssueFileOperation, IssueService } from '../issue.service';

@Injectable()
export class ContractIssueService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Issue)
    private readonly issueRepository: Repository<Issue>,
    @InjectRepository(ContractIssueItem)
    private readonly contractIssueItemRepository: Repository<ContractIssueItem>,
    private readonly issueService: IssueService,
  ) {}

  async getContractItems(id: number) {
    const items = await this.contractIssueItemRepository
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.project', 'project')
      .where('project.id = :id', { id })
      .andWhere('item.deletedAt IS NULL')
      .orderBy('item.createdAt', 'ASC')
      .getMany();

    return plainToInstance(ContractIssueItemDto, items, {
      excludeExtraneousValues: true,
    });
  }

  async getContractIssue(id: number) {
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
      .innerJoinAndSelect('issue.contract', 'contract')
      .leftJoinAndSelect('contract.currency', 'currency')
      .where('project.id = :id', { id })
      .addOrderBy('attachment.createdAt', 'DESC')
      .getOne();

    if (!issue) return null;

    return this.issueService.mapIssueToDto(issue);
  }

  async createContractIssue(user: User, body: CreateContractIssueDto) {
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
        1,
      );

      const existingContract = await queryRunner.manager.findOne(
        ContractIssue,
        {
          where: {
            project: { id: body.projectId },
          },
        },
      );
      if (existingContract) {
        throw new ConflictException('conflict_contract_issue_already_exists');
      }

      const currency = await queryRunner.manager.findOne(Currency, {
        where: { id: body.currencyId },
      });

      const issue = await queryRunner.manager.create(Issue, {
        project,
        category,
        createdBy: user,
        updatedBy: user,
        content: body.content,
      });
      const savedIssue = await queryRunner.manager.save(issue);

      const contract = await queryRunner.manager.create(ContractIssue, {
        issue: savedIssue,
        project,
        currency,
      });
      const savedContract = await queryRunner.manager.save(contract);
      savedIssue.contract = savedContract;

      const contractItems = body.contractItems.map((dto) =>
        queryRunner.manager.create(ContractIssueItem, {
          project,
          item: dto.item,
          price: dto.price,
        }),
      );
      await queryRunner.manager.save(contractItems);

      const transactionItems = await Promise.all(
        body.transactionItems.map(async (dto) => {
          const category = await queryRunner.manager.findOne(
            TransactionIssueItemCategory,
            { where: { id: dto.categoryId } },
          );

          return queryRunner.manager.create(TransactionIssueItem, {
            project,
            category,
            price: dto.price,
            ratio: dto.ratio,
            isPaid: false,
            paidAt: null,
            note: dto.note ?? null,
          });
        }),
      );
      await queryRunner.manager.save(transactionItems);

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

  async updateContractIssue(
    user: User,
    id: number,
    body: UpdateContractIssueDto,
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
          'contract',
          'attachments',
        ],
      });
      if (!issue) throw new NotFoundException('not_found_issue');

      assertOwnerOrAdmin(user, issue.createdBy.id);

      // Currency 업데이트
      if (body.currencyId) {
        const currency = await queryRunner.manager.findOne(Currency, {
          where: { id: body.currencyId },
        });
        if (currency) {
          issue.contract.currency = currency;
        }
      }

      fileOperations = await this.issueService.applyCommonIssueUpdate(
        queryRunner.manager,
        issue,
        body,
      );

      // ContractItems 업데이트
      if (body.contractItems) {
        const existingItems = await queryRunner.manager.find(
          ContractIssueItem,
          {
            where: { project: { id: issue.project.id } },
          },
        );

        const toRemove = existingItems.filter(
          (e) => !body.contractItems.some((dto) => dto.id === e.id),
        );
        if (toRemove.length)
          await queryRunner.manager.softDelete(
            ContractIssueItem,
            toRemove.map((item) => item.id),
          );

        const items = body.contractItems.map((dto) => {
          if (dto.id) {
            const existing = existingItems.find((e) => e.id === dto.id);
            if (existing) {
              existing.item = dto.item;
              existing.price = dto.price;
              return existing;
            }
          }
          return queryRunner.manager.create(ContractIssueItem, {
            project: issue.project,
            item: dto.item,
            price: dto.price,
          });
        });

        await queryRunner.manager.save(items);
      }

      // TransactionItems 업데이트
      if (body.transactionItems) {
        const existingItems = await queryRunner.manager.find(
          TransactionIssueItem,
          {
            where: { project: { id: issue.project.id } },
          },
        );

        const toRemove = existingItems.filter(
          (e) => !body.transactionItems.some((dto) => dto.id === e.id),
        );
        if (toRemove.length)
          await queryRunner.manager.softDelete(
            TransactionIssueItem,
            toRemove.map((item) => item.id),
          );

        const items = await Promise.all(
          body.transactionItems.map(async (dto) => {
            const category = await queryRunner.manager.findOne(
              TransactionIssueItemCategory,
              { where: { id: dto.categoryId } },
            );

            if (dto.id) {
              const existing = existingItems.find((e) => e.id === dto.id);
              if (existing) {
                existing.category = category;
                existing.price = dto.price;
                existing.ratio = dto.ratio;
                existing.note = dto.note;
                return existing;
              }
            }

            return queryRunner.manager.create(TransactionIssueItem, {
              project: issue.project,
              category,
              price: dto.price,
              ratio: dto.ratio,
              isPaid: false,
              paidAt: null,
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

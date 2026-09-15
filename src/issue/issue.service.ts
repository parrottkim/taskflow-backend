import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { extractImages } from '@/common/utils/markdown.util';
import { assertOwnerOrAdmin } from '@/common/policies/resource-access.policy';
import { assertWriteAccess } from '@/common/policies/write-access.policy';
import { ApprovalIssue } from '@/entity/issue/approval/approval-issue.entity';
import { ContractIssueItem } from '@/entity/issue/contract/contract-issue-item.entity';
import { ContractIssue } from '@/entity/issue/contract/contract-issue.entity';
import { IssueAttachment } from '@/entity/issue/issue-attachment.entity';
import { IssueCategory } from '@/entity/issue/issue-category.entity';
import { Issue } from '@/entity/issue/issue.entity';
import { KickoffIssue } from '@/entity/issue/kickoff/kickoff-issue.entity';
import { PaymentIssue } from '@/entity/issue/payment/payment-issue.entity';
import { ProcurementIssueItem } from '@/entity/issue/procurement/procurement-issue-item.entity';
import { ProcurementIssueRequestItem } from '@/entity/issue/procurement/procurement-issue-request-item.entity';
import { ProcurementIssueRequest } from '@/entity/issue/procurement/procurement-issue-request.entity';
import { ProcurementIssue } from '@/entity/issue/procurement/procurement-issue.entity';
import { TransactionIssueItem } from '@/entity/issue/transaction/transaction-issue-item.entity';
import { TransactionIssue } from '@/entity/issue/transaction/transaction-issue.entity';
import { Project } from '@/entity/project/project.entity';
import { User } from '@/entity/user/user.entity';
import { MailService } from '@/mail/mail.service';
import { ProjectDto } from '@/project/dto/project';
import { ProjectClientDto } from '@/project/dto/project-client';
import { ProjectClientService } from '@/project/project-client.service';
import { SftpService } from '@/sftp/sftp.service';
import { GetLatestIssuesDto } from './dto/get-latest-issues';
import {
  ApprovalIssueDto,
  ContractIssueDto,
  IssueDto,
  KickoffIssueDto,
  PaymentIssueDto,
  ProcurementIssueDto,
  TransactionIssueDto,
} from './dto/issue';
import { IssueCategoryDto } from './dto/issue-category';
import { LatestIssueDto, LatestIssueListDto } from './dto/latest-issue';
import {
  assertIssueCategory,
  shouldAdvanceLatestCategory,
} from './issue-category.util';

export type IssueAttachmentInput = {
  id?: number;
  filename: string;
  path: string;
  size: number;
};

export type IssueFileOperation = {
  type: 'delete-url' | 'delete-path' | 'archive-path';
  target: string;
};

@Injectable()
export class IssueService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Issue)
    private readonly issueRepository: Repository<Issue>,
    @InjectRepository(IssueCategory)
    private readonly issueCategoryRepository: Repository<IssueCategory>,
    private readonly projectClientService: ProjectClientService,
    private readonly mailService: MailService,
    private readonly sftpService: SftpService,
  ) {}

  async findAndLockProject(manager: EntityManager, projectId: number) {
    const project = await manager
      .createQueryBuilder(Project, 'project')
      .leftJoinAndSelect('project.latestCategory', 'latestCategory')
      .where('project.id = :projectId', { projectId })
      .setLock('pessimistic_write', undefined, ['project'])
      .getOne();

    if (!project) throw new NotFoundException('not_found_project');
    return project;
  }

  async findIssueCategory(
    manager: EntityManager,
    categoryId: number,
    expectedCategoryId: number,
  ) {
    assertIssueCategory(categoryId, expectedCategoryId);

    const category = await manager.findOne(IssueCategory, {
      where: { id: categoryId },
    });
    if (!category) throw new NotFoundException('not_found_category');
    return category;
  }

  async advanceLatestCategory(
    manager: EntityManager,
    project: Project,
    category: IssueCategory,
  ) {
    if (!shouldAdvanceLatestCategory(project.latestCategory?.id, category.id)) {
      return;
    }

    await manager.update(
      Project,
      { id: project.id },
      { latestCategory: category },
    );
    project.latestCategory = category;
  }

  async applyCommonIssueUpdate(
    manager: EntityManager,
    issue: Issue,
    body: {
      content?: string;
      attachments?: IssueAttachmentInput[];
    },
  ): Promise<IssueFileOperation[]> {
    const fileOperations: IssueFileOperation[] = [];

    if (body.content !== undefined) {
      const oldUrls = extractImages(issue.content);
      const newUrls = extractImages(body.content);
      const removedUrls = oldUrls.filter((url) => !newUrls.includes(url));

      fileOperations.push(
        ...removedUrls.map((target) => ({
          type: 'delete-url' as const,
          target,
        })),
      );
      issue.content = body.content;
    }

    if (body.attachments !== undefined) {
      const oldAttachments = issue.attachments ?? [];
      const incomingIds = new Set(
        body.attachments
          .map((attachment) => attachment.id)
          .filter((id): id is number => id !== undefined),
      );
      const toRemove = oldAttachments.filter(
        (attachment) => !incomingIds.has(attachment.id),
      );

      if (toRemove.length > 0) {
        await manager.remove(IssueAttachment, toRemove);
        fileOperations.push(
          ...toRemove.map((attachment) => ({
            type: 'delete-path' as const,
            target: attachment.path,
          })),
        );
      }

      const oldIds = new Set(oldAttachments.map((attachment) => attachment.id));
      const remainingAttachments = oldAttachments.filter(
        (attachment) => !toRemove.includes(attachment),
      );
      const newAttachments = body.attachments
        .filter(
          (attachment) =>
            attachment.id === undefined || !oldIds.has(attachment.id),
        )
        .map((attachment) =>
          manager.create(IssueAttachment, {
            filename: attachment.filename,
            path: attachment.path,
            size: attachment.size,
            issue,
          }),
        );

      issue.attachments = [...remainingAttachments, ...newAttachments];
    }

    return fileOperations;
  }

  async executeFileOperations(operations: IssueFileOperation[]) {
    for (const operation of operations) {
      try {
        if (operation.type === 'delete-url') {
          await this.sftpService.deleteFileByUrl(operation.target);
        } else if (operation.type === 'delete-path') {
          await this.sftpService.deleteFileByPath(operation.target);
        } else {
          await this.sftpService.archiveFileByPath(operation.target);
        }
      } catch (error) {
        console.warn(
          `이슈 파일 후처리 실패 (${operation.type}): ${operation.target}`,
          error,
        );
      }
    }
  }

  async mapIssueToDto(
    issue: Issue,
    manager: EntityManager = this.dataSource.manager,
  ): Promise<IssueDto | null> {
    if (!issue) return null;

    const contract = await manager.findOne(ContractIssue, {
      where: { project: { id: issue.project.id }, deletedAt: null },
      relations: ['currency'],
    });

    const contractItems = await manager.find(ContractIssueItem, {
      where: { project: { id: issue.project.id }, deletedAt: null },
      relations: ['project'],
    });

    const transactionItems = await manager.find(TransactionIssueItem, {
      where: { project: { id: issue.project.id }, deletedAt: null },
      relations: ['project', 'category'],
    });

    const dtoMap = {
      1: ContractIssueDto,
      2: KickoffIssueDto,
      3: ApprovalIssueDto,
      4: ProcurementIssueDto,
      5: TransactionIssueDto,
      6: PaymentIssueDto,
    } as Record<number, ClassConstructor<IssueDto>>;

    const DtoClass = dtoMap[issue.category?.id] ?? IssueDto;

    let payload: any = {
      ...issue,
      currency: contract?.currency,
    };

    switch (issue.category?.id) {
      case 1: // CONTRACT
        payload.contractItems = contractItems;
        payload.transactionItems = transactionItems;
        break;
      case 2: // KICKOFF
        payload.kickoffDate = issue.kickoff?.kickoffDate ?? null;
        break;
      case 4: // PROCUREMENT
        payload.procurementItems = issue.procurement?.items ?? [];
        payload.requests = issue.procurement?.requests ?? [];
        break;
      case 5: // TRANSACTION
        payload.contractItems = contractItems;
        payload.transactionItems = transactionItems;
        break;
    }

    return plainToInstance(DtoClass, payload, {
      excludeExtraneousValues: true,
    });
  }

  async getCategory(id: number) {
    const category = await this.issueCategoryRepository.findOne({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('not_found_category');
    }

    const categoryDto = plainToInstance(IssueCategoryDto, category, {
      excludeExtraneousValues: true,
    });

    return categoryDto;
  }

  async getAllCategories() {
    const categories = await this.issueCategoryRepository.find({
      order: {
        id: 'ASC',
      },
    });

    const result = plainToInstance(IssueCategoryDto, categories, {
      excludeExtraneousValues: true,
    });
    return result;
  }

  // Per-category creation logic is inlined in `createIssue` (no separate handlers)

  async getLatestIssues(value: GetLatestIssuesDto) {
    const [issues, total] = await this.issueRepository
      .createQueryBuilder('issue')
      .innerJoinAndSelect('issue.project', 'project')
      .leftJoinAndSelect('issue.category', 'category')
      .leftJoinAndSelect('issue.createdBy', 'createdBy')
      .innerJoinAndSelect('project.client', 'client')
      .orderBy('issue.createdAt', 'DESC')
      .skip((value.page - 1) * value.limit)
      .take(value.limit)
      .getManyAndCount();

    const items = await Promise.all(
      issues.map(async (issue) => {
        const ancestors = await this.projectClientService.findAncestors(
          issue.project.client.id,
        );

        const latestIssueDto = plainToInstance(LatestIssueDto, issue, {
          excludeExtraneousValues: true,
        });

        latestIssueDto.clients = ancestors.map((ancestor) =>
          plainToInstance(ProjectClientDto, ancestor),
        );
        latestIssueDto.projectId = issue.project.id;
        latestIssueDto.projectCode = issue.project.code;
        latestIssueDto.projectName = issue.project.name;

        return latestIssueDto;
      }),
    );

    const latestIssueListDto = plainToInstance(LatestIssueListDto, {
      items: items,
      page: value.page,
      total: total,
    });

    return latestIssueListDto;
  }

  async getIssue(id: number) {
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
      .leftJoinAndSelect('issue.contract', 'contract')
      .leftJoinAndSelect('issue.transaction', 'transaction')
      .leftJoinAndSelect('issue.kickoff', 'kickoff')
      .leftJoinAndSelect('issue.payment', 'payment')
      .leftJoinAndSelect('issue.procurement', 'procurement')
      .leftJoinAndSelect('procurement.items', 'items')
      .leftJoinAndSelect('items.supplier', 'supplier')
      .leftJoinAndSelect('procurement.requests', 'requests')
      .leftJoinAndSelect('requests.requestedBy', 'requestedBy')
      .leftJoinAndSelect('requests.items', 'requestItem')
      .leftJoinAndSelect('requests.supplier', 'requestSupplier')
      .where('issue.id = :id', { id })
      .addOrderBy('attachment.createdAt', 'DESC')
      .getOne();

    return await this.mapIssueToDto(issue);
  }

  async sendMail(user: User, id: number, userIds?: number[]) {
    assertWriteAccess(user);
    const issue = await this.issueRepository
      .createQueryBuilder('issue')
      .leftJoinAndSelect('issue.project', 'project')
      .leftJoinAndSelect('project.client', 'client')
      .leftJoinAndSelect('project.manager', 'manager')
      .leftJoinAndSelect('issue.category', 'category')
      .leftJoinAndSelect('issue.createdBy', 'createdBy')
      .leftJoinAndSelect('issue.updatedBy', 'updatedBy')
      .leftJoinAndSelect('createdBy.rank', 'rank')
      .leftJoinAndSelect('createdBy.department', 'department')
      .leftJoinAndSelect('updatedBy.rank', 'updatedByRank')
      .leftJoinAndSelect('updatedBy.department', 'updatedByDepartment')
      .leftJoinAndSelect('issue.attachments', 'attachment')
      .leftJoinAndSelect('issue.contract', 'contract')
      .leftJoinAndSelect('contract.currency', 'currency')
      .where('issue.id = :id', { id })
      .orderBy('issue.updatedAt', 'DESC')
      .addOrderBy('attachment.createdAt', 'DESC')
      .getOne();

    const ancestors = await this.projectClientService.findAncestors(
      issue.project.client.id,
    );

    const projectDto = plainToInstance(
      ProjectDto,
      {
        ...issue.project,
        clients: ancestors,
      },
      {
        excludeExtraneousValues: true,
      },
    );
    const issueDto = plainToInstance(IssueDto, issue, {
      excludeExtraneousValues: true,
    });

    await this.mailService.sendIssueMail(projectDto, issueDto, userIds);
  }

  async deleteIssue(user: User, id: number) {
    assertWriteAccess(user);
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    let deletedIssueDto: IssueDto;
    const fileOperations: IssueFileOperation[] = [];

    try {
      const issue = await queryRunner.manager
        .createQueryBuilder(Issue, 'issue')
        .leftJoinAndSelect('issue.project', 'project')
        .leftJoinAndSelect('issue.category', 'category')
        .leftJoinAndSelect('issue.createdBy', 'createdBy')
        .leftJoinAndSelect('issue.updatedBy', 'updatedBy')
        .leftJoinAndSelect('createdBy.rank', 'rank')
        .leftJoinAndSelect('createdBy.department', 'department')
        .leftJoinAndSelect('updatedBy.rank', 'updatedByRank')
        .leftJoinAndSelect('updatedBy.department', 'updatedByDepartment')
        .leftJoinAndSelect('issue.attachments', 'attachment')
        .leftJoinAndSelect('issue.contract', 'contract')
        .leftJoinAndSelect('contract.currency', 'currency')
        .leftJoinAndSelect('issue.transaction', 'transaction')
        .leftJoinAndSelect('issue.kickoff', 'kickoff')
        .leftJoinAndSelect('issue.payment', 'payment')
        .leftJoinAndSelect('issue.approval', 'approval')
        .leftJoinAndSelect('issue.procurement', 'procurement')
        .leftJoinAndSelect('procurement.items', 'procurementItems')
        .leftJoinAndSelect('procurementItems.supplier', 'supplier')
        .where('issue.id = :id', { id })
        .addOrderBy('attachment.createdAt', 'DESC')
        .getOne();

      if (!issue) {
        throw new NotFoundException('not_found_issue');
      }

      deletedIssueDto = await this.mapIssueToDto(issue, queryRunner.manager);

      assertOwnerOrAdmin(user, issue.createdBy.id);

      const projectId = issue.project.id;

      const project = await this.findAndLockProject(
        queryRunner.manager,
        projectId,
      );

      // Attachments 아카이브 및 soft delete
      if (issue.attachments?.length) {
        fileOperations.push(
          ...issue.attachments.map((attachment) => ({
            type: 'archive-path' as const,
            target: attachment.path,
          })),
        );
        await queryRunner.manager.softDelete(
          IssueAttachment,
          issue.attachments.map((att) => att.id),
        );
      }

      // Transaction 우선 soft delete
      if (issue.transaction) {
        await queryRunner.manager.softDelete(
          TransactionIssue,
          issue.transaction.id,
        );
      }

      // Contract 삭제 시 contractItems, transactionItems도 함께 soft delete
      if (issue.contract) {
        await queryRunner.manager.softDelete(ContractIssueItem, {
          project: { id: projectId },
        });
        await queryRunner.manager.softDelete(TransactionIssueItem, {
          project: { id: projectId },
        });
        await queryRunner.manager.softDelete(ContractIssue, issue.contract.id);
      }
      if (issue.kickoff) {
        await queryRunner.manager.softDelete(KickoffIssue, issue.kickoff.id);
      }
      if (issue.payment) {
        await queryRunner.manager.softDelete(PaymentIssue, issue.payment.id);
      }
      if (issue.approval) {
        await queryRunner.manager.softDelete(ApprovalIssue, issue.approval.id);
      }
      if (issue.procurement) {
        const requests = await queryRunner.manager.find(
          ProcurementIssueRequest,
          {
            where: { procurement: { id: issue.procurement.id } },
            relations: ['items'],
          },
        );
        const requestItemIds = requests.flatMap((request) =>
          (request.items ?? []).map((item) => item.id),
        );

        if (requestItemIds.length > 0) {
          await queryRunner.manager.softDelete(
            ProcurementIssueRequestItem,
            requestItemIds,
          );
        }
        if (requests.length > 0) {
          await queryRunner.manager.softDelete(
            ProcurementIssueRequest,
            requests.map((request) => request.id),
          );
        }

        await queryRunner.manager.softDelete(ProcurementIssueItem, {
          procurement: { id: issue.procurement.id },
        });
        await queryRunner.manager.softDelete(
          ProcurementIssue,
          issue.procurement.id,
        );
      }

      await queryRunner.manager.softDelete(Issue, id);

      const latestIssue = await queryRunner.manager
        .createQueryBuilder(Issue, 'issue')
        .leftJoinAndSelect('issue.project', 'project')
        .leftJoinAndSelect('issue.category', 'category')
        .where('issue.project.id = :projectId', { projectId })
        .orderBy('category.id', 'DESC')
        .addOrderBy('issue.createdAt', 'DESC')
        .addOrderBy('issue.id', 'DESC')
        .getOne();

      const latestCategory = latestIssue ? latestIssue.category : null;

      project.latestCategory = latestCategory ?? null;
      await queryRunner.manager.save(project);

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }

    await this.executeFileOperations(fileOperations);
    return deletedIssueDto;
  }
}

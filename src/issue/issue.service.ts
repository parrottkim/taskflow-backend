import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { ContractIssueItem } from 'src/entity/issue/contract/contract-issue-item.entity';
import { ContractIssue } from 'src/entity/issue/contract/contract-issue.entity';
import { IssueCategory } from 'src/entity/issue/issue-category.entity';
import { Issue } from 'src/entity/issue/issue.entity';
import { TransactionIssueItemCategory } from 'src/entity/issue/transaction/transaction-issue-category.entity';
import { TransactionIssueItem } from 'src/entity/issue/transaction/transaction-issue-item.entity';
import { IssueAttachment } from 'src/entity/issue/issue-attachment.entity';
import { Currency } from 'src/entity/currency/currency.entity';
import { ProcurementIssueItem } from 'src/entity/issue/procurement/procurement-issue-item.entity';
import { ProcurementIssue } from 'src/entity/issue/procurement/procurement-issue.entity';
import { TransactionIssue } from 'src/entity/issue/transaction/transaction-issue.entity';
import { KickoffIssue } from 'src/entity/issue/kickoff/kickoff-issue.entity';
import { DeclarationIssue } from 'src/entity/issue/declaration/declaration-issue.entity';
import { PaymentIssue } from 'src/entity/issue/payment/payment-issue.entity';
import { Project } from 'src/entity/project/project.entity';
import { MailService } from 'src/mail/mail.service';
import { ProjectDto } from 'src/project/dto/project';
import { ProjectClientDto } from 'src/project/dto/project-client';
import { ProjectClientService } from 'src/project/project-client.service';
import { DataSource, Repository } from 'typeorm';
import { GetLatestIssuesDto } from './dto/get-latest-issues';
import {
  ContractIssueDto,
  DeclarationIssueDto,
  IssueDto,
  IssueListDto,
  KickoffIssueDto,
  PaymentIssueDto,
  ProcurementIssueDto,
  TransactionIssueDto,
} from './dto/issue';
import { IssueCategoryDto } from './dto/issue-category';
import { LatestIssueDto, LatestIssueListDto } from './dto/latest-issue';
import { GetIssuesDto } from './dto/get-issues';
import { UpdateIssueDto } from './dto/update-issue';
import { CreateIssueDto } from './dto/create-issue';
import { User } from 'src/entity/user/user.entity';

@Injectable()
export class IssueService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Issue)
    private readonly issueRepository: Repository<Issue>,
    @InjectRepository(TransactionIssueItemCategory)
    private readonly transactionCategoryRepository: Repository<TransactionIssueItemCategory>,
    @InjectRepository(IssueCategory)
    private readonly issueCategoryRepository: Repository<IssueCategory>,
    private readonly projectClientService: ProjectClientService,
    private readonly mailService: MailService,
  ) {}

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

  async getAllTransactionCategories() {
    return await this.transactionCategoryRepository.find();
  }

  async getTransactionCategory(id: number) {
    const category = await this.transactionCategoryRepository.findOne({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('category_not_found');
    }

    return category;
  }

  async getLatestIssues(value: GetLatestIssuesDto) {
    const [issues, total] = await this.issueRepository
      .createQueryBuilder('issue')
      .leftJoinAndSelect('issue.project', 'project')
      .leftJoinAndSelect('issue.category', 'category')
      .leftJoinAndSelect('issue.user', 'user')
      .leftJoinAndSelect('project.client', 'client')
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

  async getContractIssue(id: number) {
    const issue = await this.issueRepository
      .createQueryBuilder('issue')
      .leftJoinAndSelect('issue.project', 'project')
      .leftJoinAndSelect('issue.category', 'category')
      .leftJoinAndSelect('issue.user', 'user')
      .leftJoinAndSelect('user.position', 'position')
      .leftJoinAndSelect('user.department', 'department')
      .leftJoinAndSelect('issue.attachments', 'attachments')
      .innerJoinAndSelect('issue.contract', 'contract')
      .leftJoinAndSelect('issue.contractItems', 'contractItems')
      .leftJoinAndSelect('issue.transactionItems', 'transactionItems')
      .leftJoinAndSelect('contract.currency', 'currency')
      .leftJoinAndSelect(
        'transactionItems.category',
        'transactionItemsCategory',
      )
      .where('project.id = :id', { id })
      .getOne();

    if (!issue) return null;

    const issueDto = plainToInstance(
      ContractIssueDto,
      { ...issue, currency: issue.contract.currency },
      {
        excludeExtraneousValues: true,
      },
    );

    return issueDto;
  }

  async getKickoffIssue(id: number) {
    const issue = await this.issueRepository
      .createQueryBuilder('issue')
      .leftJoinAndSelect('issue.project', 'project')
      .leftJoinAndSelect('issue.category', 'category')
      .leftJoinAndSelect('issue.user', 'user')
      .leftJoinAndSelect('user.position', 'position')
      .leftJoinAndSelect('user.department', 'department')
      .leftJoinAndSelect('issue.attachments', 'attachments')
      .innerJoinAndSelect('issue.kickoff', 'kickoff')
      .where('project.id = :id', { id })
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

  async getTransactionIssue(id: number) {
    const issue = await this.issueRepository
      .createQueryBuilder('issue')
      .leftJoinAndSelect('issue.project', 'project')
      .leftJoinAndSelect('issue.category', 'category')
      .leftJoinAndSelect('issue.user', 'user')
      .leftJoinAndSelect('user.position', 'position')
      .leftJoinAndSelect('user.department', 'department')
      .leftJoinAndSelect('issue.attachments', 'attachments')
      .innerJoinAndSelect('issue.transaction', 'transaction')
      .leftJoinAndSelect('issue.contractItems', 'contractItems')
      .leftJoinAndSelect('issue.transactionItems', 'transactionItems')
      .leftJoinAndSelect('transaction.currency', 'currency')
      .leftJoinAndSelect(
        'transactionItems.category',
        'transactionItemsCategory',
      )
      .where('project.id = :id', { id })
      .getOne();

    if (!issue) return null;

    const issueDto = plainToInstance(
      TransactionIssueDto,
      { ...issue, currency: issue.transaction.currency },
      {
        excludeExtraneousValues: true,
      },
    );

    return issueDto;
  }

  async getPaymentIssue(id: number) {
    const issue = await this.issueRepository
      .createQueryBuilder('issue')
      .leftJoinAndSelect('issue.project', 'project')
      .leftJoinAndSelect('issue.category', 'category')
      .leftJoinAndSelect('issue.user', 'user')
      .leftJoinAndSelect('user.position', 'position')
      .leftJoinAndSelect('user.department', 'department')
      .leftJoinAndSelect('issue.attachments', 'attachments')
      .innerJoinAndSelect('issue.payment', 'payment')
      .where('project.id = :id', { id })
      .getOne();

    if (!issue) return null;

    const issueDto = plainToInstance(PaymentIssueDto, issue, {
      excludeExtraneousValues: true,
    });

    return issueDto;
  }

  async getDeclarationIssues(value: GetIssuesDto) {
    const [issues, total] = await this.issueRepository
      .createQueryBuilder('issue')
      .leftJoinAndSelect('issue.project', 'project')
      .leftJoinAndSelect('issue.category', 'category')
      .leftJoinAndSelect('issue.user', 'user')
      .leftJoinAndSelect('user.position', 'position')
      .leftJoinAndSelect('user.department', 'department')
      .leftJoinAndSelect('issue.attachments', 'attachments')
      .innerJoinAndSelect('issue.declaration', 'declaration')
      .where('project.id = :id', { id: value.projectId })
      .skip((value.page - 1) * value.limit)
      .take(value.limit)
      .getManyAndCount();

    const items = plainToInstance(DeclarationIssueDto, issues, {
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

  async getProcurementIssues(value: GetIssuesDto) {
    const [issues, total] = await this.issueRepository
      .createQueryBuilder('issue')
      .leftJoinAndSelect('issue.project', 'project')
      .leftJoinAndSelect('issue.category', 'category')
      .leftJoinAndSelect('issue.user', 'user')
      .leftJoinAndSelect('user.position', 'position')
      .leftJoinAndSelect('user.department', 'department')
      .leftJoinAndSelect('issue.attachments', 'attachments')
      .innerJoinAndSelect('issue.procurement', 'procurement')
      .leftJoinAndSelect('procurement.items', 'items')
      .leftJoinAndSelect('items.supplier', 'supplier')
      .where('project.id = :id', { id: value.projectId })
      .skip((value.page - 1) * value.limit)
      .take(value.limit)
      .getManyAndCount();

    const items = issues.map((issue) => {
      return plainToInstance(
        ProcurementIssueDto,
        { ...issue, procurementItems: issue.procurement?.items || [] },
        {
          excludeExtraneousValues: true,
        },
      );
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

  async getIssue(id: number) {
    const issue = await this.issueRepository
      .createQueryBuilder('issue')
      .leftJoinAndSelect('issue.project', 'project')
      .leftJoinAndSelect('issue.category', 'category')
      .leftJoinAndSelect('issue.user', 'user')
      .leftJoinAndSelect('user.position', 'position')
      .leftJoinAndSelect('user.department', 'department')
      .leftJoinAndSelect('issue.attachments', 'attachments')
      .leftJoinAndSelect('issue.contract', 'contract')
      .leftJoinAndSelect('issue.transaction', 'transaction')
      .leftJoinAndSelect('issue.kickoff', 'kickoff')
      .leftJoinAndSelect('issue.payment', 'payment')
      .leftJoinAndSelect('issue.contractItems', 'contractItems')
      .leftJoinAndSelect('issue.transactionItems', 'transactionItems')
      .leftJoinAndSelect('issue.procurement', 'procurement')
      .leftJoinAndSelect('procurement.items', 'procurementItems')
      .leftJoinAndSelect('procurementItems.supplier', 'supplier')
      .leftJoinAndSelect('contract.currency', 'contractCurrency')
      .leftJoinAndSelect('transaction.currency', 'transactionCurrency')
      .leftJoinAndSelect(
        'transactionItems.category',
        'transactionItemsCategory',
      )
      .where('issue.id = :id', { id })
      .getOne();

    if (!issue) throw new NotFoundException('issue_not_found');

    const dtoMap = {
      1: ContractIssueDto,
      2: KickoffIssueDto,
      3: DeclarationIssueDto,
      4: ProcurementIssueDto,
      5: TransactionIssueDto,
      6: PaymentIssueDto,
    } as Record<number, any>;

    const DtoClass = dtoMap[issue.category?.id] ?? IssueDto;

    return plainToInstance(DtoClass, issue, {
      excludeExtraneousValues: true,
    });
  }

  async sendMail(id: number) {
    const issue = await this.issueRepository
      .createQueryBuilder('issue')
      .leftJoinAndSelect('issue.project', 'project')
      .leftJoinAndSelect('issue.category', 'category')
      .leftJoinAndSelect('issue.user', 'user')
      .leftJoinAndSelect('user.position', 'position')
      .leftJoinAndSelect('user.department', 'department')
      .leftJoinAndSelect('issue.attachments', 'attachments')
      .where('issue.id = :id', { id })
      .orderBy('issue.updatedAt', 'DESC')
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

    await this.mailService.sendIssueMail(projectDto, issueDto);
  }

  async createIssue(user: any, value: CreateIssueDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const project = await queryRunner.manager.findOne(Project, {
        where: { id: value.projectId },
        relations: ['contract', 'kickoff', 'transaction', 'payment'],
      });
      if (!project) throw new NotFoundException('project_not_found');

      const category = await queryRunner.manager.findOne(IssueCategory, {
        where: { id: value.categoryId },
      });
      if (!category) throw new NotFoundException('category_not_found');

      // 각 카테고리별 기존 Issue 체크 (soft-deleted 제외)
      const existingIssue = await queryRunner.manager
        .createQueryBuilder(Issue, 'issue')
        .leftJoinAndSelect('issue.contract', 'contract')
        .leftJoinAndSelect('issue.kickoff', 'kickoff')
        .leftJoinAndSelect('issue.transaction', 'transaction')
        .leftJoinAndSelect('issue.payment', 'payment')
        .where('issue.project_id = :projectId', { projectId: project.id })
        .andWhere('issue.deleted_at IS NULL')
        .getOne();

      if (value.categoryId === 1 && existingIssue?.contract)
        throw new ConflictException('contract_issue_exists');
      if (value.categoryId === 2 && existingIssue?.kickoff)
        throw new ConflictException('kickoff_issue_exists');
      if (value.categoryId === 5 && existingIssue?.transaction)
        throw new ConflictException('transaction_issue_exists');
      if (value.categoryId === 6 && existingIssue?.payment)
        throw new ConflictException('payment_issue_exists');

      // 1️⃣ Issue 생성
      const issue = queryRunner.manager.create(Issue, {
        project,
        category,
        user,
        content: value.content ?? null,
      });
      const saved = await queryRunner.manager.save(issue);

      // 2️⃣ category별 OneToOne 엔티티 생성 (items 제외)
      switch (value.categoryId) {
        case 1: {
          // CONTRACT
          const contract = queryRunner.manager.create(ContractIssue, {
            issue,
            project,
          });
          if (value.currencyId) {
            const currency = await queryRunner.manager.findOne(Currency, {
              where: { id: value.currencyId },
            });
            if (currency) contract.currency = currency;
          }
          await queryRunner.manager.save(contract);
          issue.contract = contract;
          break;
        }
        case 2: {
          // KICKOFF
          const kickoff = queryRunner.manager.create(KickoffIssue, {
            issue,
            project,
            kickoffDate: value.kickoffDate,
          });
          await queryRunner.manager.save(kickoff);
          issue.kickoff = kickoff;
          break;
        }
        case 3: {
          // DECLARATION
          const declaration = queryRunner.manager.create(DeclarationIssue, {
            issue,
            project,
          });
          await queryRunner.manager.save(declaration);
          issue.declaration = declaration;
          break;
        }
        case 4: {
          // PROCUREMENT
          const procurement = queryRunner.manager.create(ProcurementIssue, {
            issue,
            project,
          });
          procurement.items = value.procurementItems?.map((dto) =>
            queryRunner.manager.create(ProcurementIssueItem, {
              procurement,
              ...dto,
            }),
          );
          await queryRunner.manager.save(procurement);
          issue.procurement = procurement;
          break;
        }
        case 5: {
          // TRANSACTION
          const transaction = queryRunner.manager.create(TransactionIssue, {
            issue,
            project,
          });
          if (value.currencyId) {
            const currency = await queryRunner.manager.findOne(Currency, {
              where: { id: value.currencyId },
            });
            if (currency) transaction.currency = currency;
          }
          await queryRunner.manager.save(transaction);
          issue.transaction = transaction;
          break;
        }
        case 6: {
          // PAYMENT
          const payment = queryRunner.manager.create(PaymentIssue, {
            issue,
            project,
          });
          await queryRunner.manager.save(payment);
          issue.payment = payment;
          break;
        }
      }

      // ContractItems
      if (value.contractItems?.length) {
        issue.contractItems = value.contractItems.map((dto) =>
          queryRunner.manager.create(ContractIssueItem, { issue, ...dto }),
        );
      }

      // TransactionItems
      if (value.transactionItems?.length) {
        issue.transactionItems = await Promise.all(
          value.transactionItems.map(async (dto) => {
            const category = await queryRunner.manager.findOne(
              TransactionIssueItemCategory,
              { where: { id: dto.categoryId } },
            );
            return queryRunner.manager.create(TransactionIssueItem, {
              issue,
              category,
              ...dto,
            });
          }),
        );
      }

      // 5️⃣ 프로젝트 latestCategory 업데이트
      project.latestCategory = category;

      await queryRunner.manager.update(
        Project,
        { id: project.id },
        { latestCategory: category }, // contract는 건드리지 않음
      );

      await queryRunner.commitTransaction();

      // DTO 변환
      const dtoMap = {
        1: ContractIssueDto,
        2: KickoffIssueDto,
        3: DeclarationIssueDto,
        4: ProcurementIssueDto,
        5: TransactionIssueDto,
        6: PaymentIssueDto,
      } as Record<number, any>;

      return plainToInstance(dtoMap[saved.category?.id] ?? IssueDto, saved, {
        excludeExtraneousValues: true,
      });
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async updateIssue(user: any, id: number, value: UpdateIssueDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let issue = await queryRunner.manager.findOne(Issue, {
        where: { id },
        relations: [
          'category',
          'user',
          'attachments',
          'contractItems',
          'transactionItems',
          'procurement',
          'project',
          'contract',
          'transaction',
        ],
      });

      if (!issue) throw new NotFoundException('issue_not_found');

      if (issue.user.id !== user.id && !user.isAdmin) {
        throw new ForbiddenException('no_permission');
      }

      // 1️⃣ content 업데이트
      if (typeof value.content === 'string') issue.content = value.content;

      // 2️⃣ attachments 업데이트
      if (value.attachments) {
        const old = issue.attachments ?? [];
        const toRemove = old.filter(
          (o) => !value.attachments.some((n) => n.id === o.id),
        );
        if (toRemove.length)
          await queryRunner.manager.remove(IssueAttachment, toRemove);

        const newOnes = value.attachments
          .filter((n) => !old.some((o) => o.id === n.id))
          .map((n) =>
            queryRunner.manager.create(IssueAttachment, { ...n, issue }),
          );

        issue.attachments = [
          ...old.filter((o) => !toRemove.includes(o)),
          ...newOnes,
        ];
      }

      // 3️⃣ category별 OneToOne 엔티티 확인 및 생성
      switch (issue.category.id) {
        case 1: // CONTRACT
          if (!issue.contract)
            issue.contract = await queryRunner.manager.save(
              queryRunner.manager.create(ContractIssue, { issue }),
            );
          if (value.currencyId) {
            const currency = await queryRunner.manager.findOne(Currency, {
              where: { id: value.currencyId },
            });
            if (currency) {
              issue.contract.currency = currency;
              await queryRunner.manager.save(issue.contract);
              if (issue.transaction) {
                issue.transaction.currency = currency;
                await queryRunner.manager.save(issue.transaction);
              }
            }
          }
          break;
        case 2: // KICKOFF
          if (!issue.kickoff)
            issue.kickoff = await queryRunner.manager.save(
              queryRunner.manager.create(KickoffIssue, { issue }),
            );
          if (value.kickoffDate) issue.kickoff.kickoffDate = value.kickoffDate;
          break;
        case 4: // PROCUREMENT
          if (!issue.procurement)
            issue.procurement = await queryRunner.manager.save(
              queryRunner.manager.create(ProcurementIssue, { issue }),
            );
          if (value.procurementItems?.length) {
            issue.procurement.items = value.procurementItems.map((dto) =>
              queryRunner.manager.create(ProcurementIssueItem, {
                procurement: issue.procurement,
                ...dto,
              }),
            );
          }
          break;
        case 5: // TRANSACTION
          if (!issue.transaction)
            issue.transaction = await queryRunner.manager.save(
              queryRunner.manager.create(TransactionIssue, { issue }),
            );
          if (value.currencyId) {
            const currency = await queryRunner.manager.findOne(Currency, {
              where: { id: value.currencyId },
            });
            if (currency) {
              issue.transaction.currency = currency;
              await queryRunner.manager.save(issue.transaction);
              if (issue.contract) {
                issue.contract.currency = currency;
                await queryRunner.manager.save(issue.contract);
              }
            }
          }
          break;
        default:
          break;
      }

      // 4️⃣ ContractItems 업데이트
      if (value.contractItems?.length) {
        issue.contractItems = await Promise.all(
          value.contractItems.map(async (dto) => {
            if (dto.id) {
              const existing = issue.contractItems.find((i) => i.id === dto.id);
              if (existing) {
                existing.item = dto.item;
                existing.price = dto.price;
                return existing;
              }
            }
            return queryRunner.manager.create(ContractIssueItem, {
              issue,
              item: dto.item,
              price: dto.price,
            });
          }),
        );
      }

      // 5️⃣ TransactionItems 업데이트
      if (value.transactionItems?.length) {
        issue.transactionItems = await Promise.all(
          value.transactionItems.map(async (dto) => {
            const category = await queryRunner.manager.findOne(
              TransactionIssueItemCategory,
              { where: { id: dto.categoryId } },
            );
            if (dto.id) {
              const existing = issue.transactionItems.find(
                (i) => i.id === dto.id,
              );
              if (existing) {
                existing.category = category;
                existing.ratio = dto.ratio;
                existing.price = dto.price;
                existing.isPaid = dto.isPaid;
                existing.paidAt = dto.paidAt;
                existing.note = dto.note;
                return existing;
              }
            }
            return queryRunner.manager.create(TransactionIssueItem, {
              issue,
              category,
              ratio: dto.ratio,
              price: dto.price,
              isPaid: dto.isPaid,
              paidAt: dto.paidAt,
              note: dto.note,
            });
          }),
        );
      }

      const saved = await queryRunner.manager.save(issue);
      await queryRunner.commitTransaction();

      const dtoMap = {
        1: ContractIssueDto,
        2: KickoffIssueDto,
        3: DeclarationIssueDto,
        4: ProcurementIssueDto,
        5: TransactionIssueDto,
        6: PaymentIssueDto,
      } as Record<number, any>;

      const DtoClass = dtoMap[saved.category?.id] ?? IssueDto;

      const result = plainToInstance(DtoClass, saved, {
        excludeExtraneousValues: true,
      });
      return result;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async deleteIssue(user: User, id: number) {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const issue = await this.issueRepository
        .createQueryBuilder('issue')
        .leftJoinAndSelect('issue.project', 'project')
        .leftJoinAndSelect('issue.category', 'category')
        .leftJoinAndSelect('issue.user', 'user')
        .leftJoinAndSelect('user.position', 'position')
        .leftJoinAndSelect('user.department', 'department')
        .leftJoinAndSelect('issue.attachments', 'attachments')
        .leftJoinAndSelect('issue.contract', 'contract')
        .leftJoinAndSelect('issue.transaction', 'transaction')
        .leftJoinAndSelect('issue.kickoff', 'kickoff')
        .leftJoinAndSelect('issue.payment', 'payment')
        .leftJoinAndSelect('issue.contractItems', 'contractItems')
        .leftJoinAndSelect('issue.transactionItems', 'transactionItems')
        .leftJoinAndSelect('issue.procurement', 'procurement')
        .leftJoinAndSelect('procurement.items', 'procurementItems')
        .leftJoinAndSelect('procurementItems.supplier', 'supplier')
        .leftJoinAndSelect('contract.currency', 'contractCurrency')
        .leftJoinAndSelect('transaction.currency', 'transactionCurrency')
        .leftJoinAndSelect(
          'transactionItems.category',
          'transactionItemsCategory',
        )
        .where('issue.id = :id', { id })
        .getOne();

      const dtoMap = {
        1: ContractIssueDto,
        2: KickoffIssueDto,
        3: DeclarationIssueDto,
        4: ProcurementIssueDto,
        5: TransactionIssueDto,
        6: PaymentIssueDto,
      } as Record<number, any>;

      const DtoClass = dtoMap[issue.category?.id] ?? IssueDto;

      const issueDto = plainToInstance(DtoClass, issue, {
        excludeExtraneousValues: true,
      });

      if (!issue) {
        throw new NotFoundException('issue_not_found');
      }

      if (issue.user.id !== user.id && !user.isAdmin) {
        throw new ForbiddenException('no_permission');
      }

      const projectId = issue.project.id;

      await queryRunner.manager.softDelete(Issue, id);

      const latestIssue = await queryRunner.manager
        .createQueryBuilder(Issue, 'issue')
        .leftJoinAndSelect('issue.project', 'project')
        .leftJoinAndSelect('issue.category', 'category')
        .where('issue.project.id = :projectId', { projectId })
        .orderBy('issue.createdAt', 'DESC')
        .getOne();

      const latestCategory = latestIssue ? latestIssue.category : null;

      const project = await queryRunner.manager.findOne(Project, {
        where: { id: projectId },
      });

      if (project) {
        project.latestCategory = latestCategory ?? null;
        await queryRunner.manager.save(project);
      }

      await queryRunner.commitTransaction();

      return issueDto;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}

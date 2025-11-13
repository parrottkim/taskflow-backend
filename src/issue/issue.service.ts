import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { IssueCategory } from 'src/entity/issue/issue-category.entity';
import { Issue } from 'src/entity/issue/issue.entity';
import { DataSource, Repository } from 'typeorm';
import { IssueCategoryDto } from './dto/issue-category';
import { ProjectClientService } from 'src/project/project-client.service';
import { ProjectClientDto } from 'src/project/dto/project-client';
import { LatestIssueDto, LatestIssueListDto } from './dto/latest-issue';
import { GetLatestIssuesDto } from './dto/get-latest-issues';
import { GetIssuesDto } from './dto/get-issues';
import { IssueDto, IssueListDto } from './dto/issue';
import { CreateIssueDto } from './dto/create-issue';
import { ProjectService } from 'src/project/project.service';
import { User } from 'src/entity/user/user.entity';
import { UpdateIssueDto } from './dto/update-issue';
import { extractImages } from 'src/common/utils/markdown.util';
import { SftpService } from 'src/sftp/sftp.service';
import { IssueAttachment } from 'src/entity/issue/issue-attachment.entity';
import { ContractIssue } from 'src/entity/issue/contract/contract-issue.entity';
import { KickoffIssue } from 'src/entity/issue/kickoff/kickoff-issue.entity';
import { ApprovalIssue } from 'src/entity/issue/approval/approval-issue.entity';
import { ProcurementIssue } from 'src/entity/issue/procurement/procurement-issue.entity';
import { TransactionIssue } from 'src/entity/issue/transaction/transaction-issue.entity';
import { DeclarationIssue } from 'src/entity/issue/declaration/declaration-issue.entity';
import { PaymentIssue } from 'src/entity/issue/payment/payment-issue.entity';
import { SupplierService } from 'src/supplier/supplier.service';
import { ProcurementIssueItem } from 'src/entity/issue/procurement/procurement-issue-item.entity';
import { ContractIssueItem } from 'src/entity/issue/contract/contract-issue-item.entity';
import { TransactionIssueItem } from 'src/entity/issue/transaction/transaction-issue-item.entity';
import { TransactionIssueItemCategory } from 'src/entity/issue/transaction/transaction-issue-category.entity';
import { TransactionIssueItemCategoryDto } from './dto/issue-details';
import { UpdateProjectDto } from 'src/project/dto/update-project';
import { CurrencyService } from 'src/currency/currency.service';
import { Currency } from 'src/entity/issue/currency/currency.entity';
import { Supplier } from 'src/entity/supplier/supplier.entity';

@Injectable()
export class IssueService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Issue)
    private readonly issueRepository: Repository<Issue>,
    @InjectRepository(IssueCategory)
    private readonly issueCategoryRepository: Repository<IssueCategory>,
    @InjectRepository(TransactionIssueItemCategory)
    private readonly transactionIssueItemCategoryRepository: Repository<TransactionIssueItemCategory>,
    private readonly projectService: ProjectService,
    private readonly projectClientService: ProjectClientService,
    private readonly sftpService: SftpService,
    private readonly currencyService: CurrencyService,
    private readonly supplierService: SupplierService,
  ) {}

  async findCategoryById(id: number) {
    return await this.issueCategoryRepository
      .createQueryBuilder('category')
      .leftJoinAndSelect('category.charge', 'charge')
      .where('category.id = :id', { id })
      .getOne();
  }

  async findAllCategories() {
    return await this.issueCategoryRepository
      .createQueryBuilder('category')
      .leftJoinAndSelect('category.charge', 'charge')
      .orderBy('category.id', 'ASC')
      .getMany();
  }

  async findTransactionCategoryById(id: number) {
    return await this.transactionIssueItemCategoryRepository
      .createQueryBuilder('category')
      .where('category.id = :id', { id })
      .getOne();
  }

  async findAllTransactionCategories() {
    return await this.transactionIssueItemCategoryRepository
      .createQueryBuilder('category')
      .orderBy('category.id', 'ASC')
      .getMany();
  }

  async findLatestIssues(value: GetLatestIssuesDto) {
    return await this.issueRepository
      .createQueryBuilder('issue')
      .leftJoinAndSelect('issue.project', 'project')
      .leftJoinAndSelect('issue.category', 'category')
      .leftJoinAndSelect('category.charge', 'charge')
      .leftJoinAndSelect('issue.user', 'user')
      .leftJoinAndSelect('project.client', 'client')
      .orderBy('issue.createdAt', 'DESC')
      .skip((value.page - 1) * value.limit)
      .take(value.limit)
      .getManyAndCount();
  }

  async findIssueById(id: number) {
    return await this.issueRepository
      .createQueryBuilder('issue')
      .leftJoinAndSelect('issue.project', 'project')
      .leftJoinAndSelect('issue.category', 'category')
      .leftJoinAndSelect('category.charge', 'charge')
      .leftJoinAndSelect('issue.user', 'user')
      .leftJoinAndSelect('user.position', 'position')
      .leftJoinAndSelect('user.department', 'department')
      .leftJoinAndSelect('issue.contract', 'contract')
      .leftJoinAndSelect('contract.items', 'contractItems')
      .leftJoinAndSelect('contractItems.currency', 'contractCurrency')
      .leftJoinAndSelect('issue.kickoff', 'kickoff')
      .leftJoinAndSelect('issue.approval', 'approval')
      .leftJoinAndSelect('issue.procurement', 'procurement')
      .leftJoinAndSelect('procurement.items', 'procurementItems')
      .leftJoinAndSelect('procurementItems.supplier', 'supplier')
      .leftJoinAndSelect('supplier.keywords', 'keywords')
      .leftJoinAndSelect('issue.transaction', 'transaction')
      .leftJoinAndSelect('transaction.items', 'transactionItems')
      .leftJoinAndSelect('transactionItems.currency', 'transactionCurrency')
      .leftJoinAndSelect(
        'transactionItems.category',
        'transactionItemsCategory',
      )
      .leftJoinAndSelect('issue.declaration', 'declaration')
      .leftJoinAndSelect('issue.payment', 'payment')
      .leftJoinAndSelect('issue.attachments', 'attachment')
      .where('issue.id = :id', { id })
      .getOne();
  }

  async findIssues(value: GetIssuesDto) {
    return await this.issueRepository
      .createQueryBuilder('issue')
      .leftJoinAndSelect('issue.project', 'project')
      .leftJoinAndSelect('issue.category', 'category')
      .leftJoinAndSelect('category.charge', 'charge')
      .leftJoinAndSelect('issue.user', 'user')
      .leftJoinAndSelect('user.position', 'position')
      .leftJoinAndSelect('user.department', 'department')
      .leftJoinAndSelect('issue.contract', 'contract')
      .leftJoinAndSelect('contract.items', 'contractItems')
      .leftJoinAndSelect('contractItems.currency', 'contractCurrency')
      .leftJoinAndSelect('issue.kickoff', 'kickoff')
      .leftJoinAndSelect('issue.approval', 'approval')
      .leftJoinAndSelect('issue.procurement', 'procurement')
      .leftJoinAndSelect('procurement.items', 'procurementItems')
      .leftJoinAndSelect('procurementItems.supplier', 'supplier')
      .leftJoinAndSelect('supplier.keywords', 'keywords')
      .leftJoinAndSelect('issue.transaction', 'transaction')
      .leftJoinAndSelect('transaction.items', 'transactionItems')
      .leftJoinAndSelect('transactionItems.currency', 'transactionCurrency')
      .leftJoinAndSelect(
        'transactionItems.category',
        'transactionItemsCategory',
      )
      .leftJoinAndSelect('issue.declaration', 'declaration')
      .leftJoinAndSelect('issue.payment', 'payment')
      .leftJoinAndSelect('issue.attachments', 'attachment')
      .orderBy('issue.createdAt', 'DESC')
      .where('project.id = :id', { id: value.projectId })
      .skip((value.page - 1) * value.limit)
      .take(value.limit)
      .getManyAndCount();
  }

  async getAllCategories() {
    const categories = await this.findAllCategories();

    const result = plainToInstance(IssueCategoryDto, categories, {
      excludeExtraneousValues: true,
    });

    return result;
  }

  async getAllTransactionCategories() {
    const categories = await this.findAllTransactionCategories();

    const result = plainToInstance(
      TransactionIssueItemCategoryDto,
      categories,
      {
        excludeExtraneousValues: true,
      },
    );

    return result;
  }

  async getLatestIssues(value: GetLatestIssuesDto) {
    const [issues, total] = await this.findLatestIssues(value);

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

  async getIssue(user: User, id: number) {
    const issue = await this.findIssueById(id);

    if (!issue) {
      throw new NotFoundException('issue_not_found');
    }

    const issueDto = plainToInstance(IssueDto, issue, {
      excludeExtraneousValues: true,
    });

    return issueDto;
  }

  async getIssues(value: GetIssuesDto) {
    const [issues, total] = await this.findIssues(value);

    const issueListDto = plainToInstance(
      IssueListDto,
      {
        items: issues,
        page: value.page,
        total: total,
      },
      {
        excludeExtraneousValues: true,
      },
    );

    return issueListDto;
  }

  async createIssue(user: User, value: CreateIssueDto) {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const project = await this.projectService.findProjectById(
        value.projectId,
      );
      const category = await this.findCategoryById(value.categoryId);

      const issue = queryRunner.manager.create(Issue, {
        content: value.content,
        project: project,
        category: category,
        user: user,
      });

      // 카테고리별 상세 처리
      switch (value.categoryId) {
        case 1:
          if (value.contract) {
            const contractItems = await Promise.all(
              value.contract.items.map(async (item) => {
                const currency = await queryRunner.manager.findOne(Currency, {
                  where: { id: item.currencyId },
                });

                return queryRunner.manager.create(ContractIssueItem, {
                  currency: currency,
                  item: item.item,
                  price: item.price,
                });
              }),
            );

            issue.contract = queryRunner.manager.create(ContractIssue, {
              items: contractItems,
            });
          }
          break;
        case 2:
          issue.kickoff = queryRunner.manager.create(KickoffIssue, {
            kickoffDate: value.kickoff.kickoffDate,
          });
          break;
        case 3:
          issue.approval = queryRunner.manager.create(ApprovalIssue, {});
          break;
        case 4:
          if (value.procurement) {
            const procurementItems = await Promise.all(
              value.procurement.items.map(async (item) => {
                const supplier = item.supplierId
                  ? await queryRunner.manager.findOne(Supplier, {
                      where: { id: item.supplierId },
                    })
                  : null;

                return queryRunner.manager.create(ProcurementIssueItem, {
                  item: item.item,
                  spec: item.spec,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  totalAmount: item.totalAmount,
                  isOnlinePurchase: item.isOnlinePurchase,
                  purchaseUrl: item.purchaseUrl,
                  supplier: supplier,
                });
              }),
            );

            issue.procurement = queryRunner.manager.create(ProcurementIssue, {
              items: procurementItems,
            });
          }
          break;
        case 5:
          if (value.transaction) {
            const transactionItems = await Promise.all(
              value.transaction.items.map(async (item) => {
                const category = await queryRunner.manager.findOne(
                  TransactionIssueItemCategory,
                  {
                    where: { id: item.categoryId },
                  },
                );
                const currency = await queryRunner.manager.findOne(Currency, {
                  where: { id: item.currencyId },
                });

                return queryRunner.manager.create(TransactionIssueItem, {
                  category: category,
                  currency: currency,
                  price: item.price,
                  note: item.note,
                });
              }),
            );

            issue.transaction = queryRunner.manager.create(TransactionIssue, {
              items: transactionItems,
            });
          }
          break;
        case 6:
          issue.declaration = queryRunner.manager.create(DeclarationIssue, {});
          break;
        case 7:
          issue.payment = queryRunner.manager.create(PaymentIssue, {});
          break;
      }

      // 프로젝트 업데이트
      const updateDto: UpdateProjectDto = { categoryId: value.categoryId };
      if (category.id === 1) {
        updateDto.isPreexecuted = false;
        updateDto.isContracted = true;
      }
      await this.projectService.updateProject(
        project.user,
        project.id,
        updateDto,
      );

      // Issue 저장
      const saved = await queryRunner.manager.save(issue);

      await queryRunner.commitTransaction();

      const issueDto = plainToInstance(IssueDto, saved, {
        excludeExtraneousValues: true,
      });
      issueDto.attachments = [];

      return issueDto;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async updateIssue(user: User, id: number, value: UpdateIssueDto) {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const issue = await queryRunner.manager
        .createQueryBuilder(Issue, 'issue')
        .leftJoinAndSelect('issue.user', 'user')
        .leftJoinAndSelect('issue.category', 'category')
        .leftJoinAndSelect('issue.attachments', 'attachments')
        .leftJoinAndSelect('issue.contract', 'contract')
        .leftJoinAndSelect('issue.kickoff', 'kickoff')
        .leftJoinAndSelect('issue.approval', 'approval')
        .leftJoinAndSelect('issue.procurement', 'procurement')
        .leftJoinAndSelect('issue.transaction', 'transaction')
        .leftJoinAndSelect('issue.declaration', 'declaration')
        .leftJoinAndSelect('issue.payment', 'payment')
        .leftJoinAndSelect('category.charge', 'charge')
        .leftJoinAndSelect('contract.items', 'contractItems')
        .leftJoinAndSelect('contractItems.currency', 'contractCurrency')
        .leftJoinAndSelect('procurement.items', 'procurementItems')
        .leftJoinAndSelect('transaction.items', 'transactionItems')
        .leftJoinAndSelect('transactionItems.currency', 'transactionCurrency')
        .where('issue.id = :id', { id })
        .getOne();

      if (!issue) {
        throw new NotFoundException('issue_not_found');
      }

      if (issue.user.id !== user.id && !user.isAdmin) {
        throw new ForbiddenException('no_permission');
      }

      // --- content 처리 ---
      if (typeof value.content === 'string') {
        const oldUrls = extractImages(issue.content);
        const newUrls = extractImages(value.content);
        const removedUrls = oldUrls.filter((url) => !newUrls.includes(url));

        for (const url of removedUrls) {
          try {
            await this.sftpService.deleteFileByUrl(url);
          } catch (e) {
            console.warn(`삭제 실패: ${url}`, e);
          }
        }

        issue.content = value.content;
      }

      // --- attachments 처리 ---
      if (value.attachments) {
        const oldAttachments = issue.attachments || [];
        const toRemove = oldAttachments.filter(
          (oldAtt) =>
            !value.attachments.some((newAtt) => newAtt.id === oldAtt.id),
        );

        for (const att of toRemove) {
          try {
            await this.sftpService.deleteFileByPath(att.path);
          } catch (e) {
            console.warn(`SFTP 삭제 실패: ${att.path}`, e);
          }
        }

        if (toRemove.length > 0) {
          await queryRunner.manager.remove(IssueAttachment, toRemove);
        }

        const remainingAttachments = oldAttachments.filter(
          (att) => !toRemove.includes(att),
        );
        const newAttachments = value.attachments
          .filter((att) => !oldAttachments.some((old) => old.id === att.id))
          .map((att) =>
            queryRunner.manager.create(IssueAttachment, {
              name: att.filename,
              path: att.path,
              size: att.size,
              issue: issue,
            }),
          );

        issue.attachments = [...remainingAttachments, ...newAttachments];
      }

      // --- contract items 처리 ---
      if (value.contract) {
        issue.contract ??= queryRunner.manager.create(ContractIssue, { issue });
        issue.contract.items = await Promise.all(
          value.contract.items.map(async (dto) => {
            const currency = await queryRunner.manager.findOne(Currency, {
              where: { id: dto.currencyId },
            });

            if (dto.id) {
              const existing = issue.contract.items.find(
                (i) => i.id === dto.id,
              );
              if (existing) {
                existing.item = dto.item;
                existing.currency = currency;
                existing.price = dto.price;
                return existing;
              }
            }
            return queryRunner.manager.create(ContractIssueItem, {
              item: dto.item,
              currency,
              price: dto.price,
              contract: issue.contract,
            });
          }),
        );
      }

      if (value.kickoff) {
        issue.kickoff ??= queryRunner.manager.create(KickoffIssue, { issue });
        issue.kickoff.kickoffDate =
          value.kickoff.kickoffDate ?? issue.kickoff.kickoffDate;
      }

      // --- procurement items 처리 ---
      if (value.procurement) {
        issue.procurement ??= queryRunner.manager.create(ProcurementIssue, {
          issue,
        });
        issue.procurement.items = await Promise.all(
          value.procurement.items.map(async (dto) => {
            const supplier = dto.supplierId
              ? await this.supplierService.findSupplierById(dto.supplierId)
              : null;

            if (dto.id) {
              const existing = issue.procurement.items.find(
                (i) => i.id === dto.id,
              );
              if (existing) {
                existing.item = dto.item;
                existing.spec = dto.spec;
                existing.quantity = dto.quantity;
                existing.unitPrice = dto.unitPrice;
                existing.totalAmount = dto.totalAmount;
                existing.isOnlinePurchase = dto.isOnlinePurchase;
                existing.purchaseUrl = dto.purchaseUrl;
                existing.supplier = supplier;
                return existing;
              }
            }

            return queryRunner.manager.create(ProcurementIssueItem, {
              item: dto.item,
              spec: dto.spec,
              quantity: dto.quantity,
              unitPrice: dto.unitPrice,
              totalAmount: dto.totalAmount,
              isOnlinePurchase: dto.isOnlinePurchase,
              purchaseUrl: dto.purchaseUrl,
              supplier,
              procurement: issue.procurement,
            });
          }),
        );
      }

      // --- transaction items 처리 ---
      if (value.transaction) {
        issue.transaction ??= queryRunner.manager.create(TransactionIssue, {
          issue,
        });
        issue.transaction.items = await Promise.all(
          value.transaction.items.map(async (dto) => {
            const category = await queryRunner.manager.findOne(
              TransactionIssueItemCategory,
              {
                where: { id: dto.categoryId },
              },
            );
            const currency = await queryRunner.manager.findOne(Currency, {
              where: { id: dto.currencyId },
            });

            if (dto.id) {
              const existing = issue.transaction.items.find(
                (i) => i.id === dto.id,
              );
              if (existing) {
                existing.category = category;
                existing.currency = currency;
                existing.price = dto.price;
                existing.note = dto.note;
                return existing;
              }
            }

            return queryRunner.manager.create(TransactionIssueItem, {
              category,
              currency,
              price: dto.price,
              note: dto.note,
              transaction: issue.transaction,
            });
          }),
        );
      }

      const saved = await queryRunner.manager.save(issue);

      await queryRunner.commitTransaction();

      const issueDto = plainToInstance(IssueDto, saved, {
        excludeExtraneousValues: true,
      });

      return issueDto;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async deleteIssue(id: number) {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const issue = await this.findIssueById(id);

      if (!issue) {
        throw new NotFoundException('issue_not_found');
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

      const project = await this.projectService.findProjectById(projectId);

      const updateDto: UpdateProjectDto = {
        categoryId: latestCategory ? latestCategory.id : null,
      };

      await this.projectService.updateProject(
        project.user,
        projectId,
        updateDto,
      );

      await queryRunner.commitTransaction();

      return { success: true };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async restoreIssue(id: number) {
    await this.issueRepository.restore(id);
    const issue = await this.findIssueById(id);

    if (!issue) {
      throw new NotFoundException('issue_not_found');
    }

    return plainToInstance(IssueDto, issue, {
      excludeExtraneousValues: true,
    });
  }
}

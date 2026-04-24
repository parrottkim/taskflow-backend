import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { ContractIssue } from '@/entity/issue/contract/contract-issue.entity';
import { IssueCategory } from '@/entity/issue/issue-category.entity';
import { Issue } from '@/entity/issue/issue.entity';
import { TransactionIssueItemCategory } from '@/entity/issue/transaction/transaction-issue-category.entity';
import { TransactionIssueItem } from '@/entity/issue/transaction/transaction-issue-item.entity';
import { IssueAttachment } from '@/entity/issue/issue-attachment.entity';
import { Currency } from '@/entity/currency/currency.entity';
import { ProcurementIssueItem } from '@/entity/issue/procurement/procurement-issue-item.entity';
import { ProcurementIssue } from '@/entity/issue/procurement/procurement-issue.entity';
import { TransactionIssue } from '@/entity/issue/transaction/transaction-issue.entity';
import { KickoffIssue } from '@/entity/issue/kickoff/kickoff-issue.entity';
import { ApprovalIssue } from '@/entity/issue/approval/approval-issue.entity';
import { PaymentIssue } from '@/entity/issue/payment/payment-issue.entity';
import { Project } from '@/entity/project/project.entity';
import { MailService } from '@/mail/mail.service';
import { ProjectDto } from '@/project/dto/project';
import { ProjectClientDto } from '@/project/dto/project-client';
import { ProjectClientService } from '@/project/project-client.service';
import { DataSource, Repository } from 'typeorm';
import { GetLatestIssuesDto } from './dto/get-latest-issues';
import {
  ContractIssueDto,
  ContractIssueItemDto,
  ApprovalIssueDto,
  IssueDto,
  IssueListDto,
  KickoffIssueDto,
  PaymentIssueDto,
  ProcurementIssueDto,
  TransactionIssueDto,
  TransactionIssueItemDto,
} from './dto/issue';
import { IssueCategoryDto } from './dto/issue-category';
import { LatestIssueDto, LatestIssueListDto } from './dto/latest-issue';
import { GetIssuesDto } from './dto/get-issues';
import {
  CreateApprovalIssueDto,
  CreateContractIssueDto,
  CreateKickoffIssueDto,
  CreatePaymentIssueDto,
  CreateProcurementIssueDto,
  CreateTransactionIssueDto,
} from './dto/create-issue';
import { User } from '@/entity/user/user.entity';
import { ContractIssueItem } from '@/entity/issue/contract/contract-issue-item.entity';
import dayjs from 'dayjs';
import { Supplier } from '@/entity/supplier/supplier.entity';
import { SftpService } from '@/sftp/sftp.service';
import {
  UpdateApprovalIssueDto,
  UpdateContractIssueDto,
  UpdateKickoffIssueDto,
  UpdatePaymentIssueDto,
  UpdateProcurementIssueDto,
  UpdateTransactionIssueDto,
} from './dto/update-issue';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';
import * as ExcelJS from 'exceljs';
import { ConfigType } from '@nestjs/config';
import config from '@/config/config';

@Injectable()
export class IssueService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Issue)
    private readonly issueRepository: Repository<Issue>,
    @InjectRepository(ContractIssueItem)
    private readonly contractIssueItemRepository: Repository<ContractIssueItem>,
    @InjectRepository(TransactionIssueItem)
    private readonly transactionIssueItemRepository: Repository<TransactionIssueItem>,
    @InjectRepository(TransactionIssueItemCategory)
    private readonly transactionCategoryRepository: Repository<TransactionIssueItemCategory>,
    @InjectRepository(IssueCategory)
    private readonly issueCategoryRepository: Repository<IssueCategory>,
    private readonly projectClientService: ProjectClientService,
    private readonly mailService: MailService,
    private readonly sftpService: SftpService,
    @Inject(config.KEY)
    private configService: ConfigType<typeof config>,
  ) {}

  private async mapIssueToDto(issue: Issue) {
    if (!issue) return null;

    const contract = await this.dataSource.manager.findOne(ContractIssue, {
      where: { project: { id: issue.project.id }, deletedAt: null },
      relations: ['currency'],
    });

    const contractItems = await this.contractIssueItemRepository.find({
      where: { project: { id: issue.project.id } },
      relations: ['project'],
    });

    const transactionItems = await this.transactionIssueItemRepository.find({
      where: { project: { id: issue.project.id } },
      relations: ['project', 'category'],
    });

    const dtoMap = {
      1: ContractIssueDto,
      2: KickoffIssueDto,
      3: ApprovalIssueDto,
      4: ProcurementIssueDto,
      5: TransactionIssueDto,
      6: PaymentIssueDto,
    } as Record<number, any>;

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
      throw new NotFoundException('category_not_found');
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

  async exportPurchaseRequest(id: number) {
    const TEMPLATE_BASE_PATH = path.join(process.cwd(), 'templates');
    const TEMPLATE_FILE_NAME = 'purchase_template.xlsx';

    const PATH_FILENAME = `purchase_${id}_filled`;
    const TEMPLATE_PATH = path.join(TEMPLATE_BASE_PATH, TEMPLATE_FILE_NAME);

    const issue = await this.issueRepository
      .createQueryBuilder('issue')
      .leftJoinAndSelect('issue.project', 'project')
      .leftJoinAndSelect('issue.user', 'user')
      .innerJoinAndSelect('issue.procurement', 'procurement')
      .leftJoinAndSelect('procurement.items', 'items')
      .leftJoinAndSelect('items.supplier', 'supplier')
      .where('issue.id = :id', { id })
      .getOne();
    if (!issue) throw new NotFoundException('issue_not_found');

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(TEMPLATE_PATH);

      const worksheet = workbook.worksheets[0];

      worksheet.pageSetup = {
        paperSize: 9,
        orientation: 'portrait',
        fitToPage: true,
        horizontalCentered: true,
        verticalCentered: true,
        margins: {
          left: 0.5 / 2.54,
          right: 0.5 / 2.54,
          top: 0.5 / 2.54,
          bottom: 0.5 / 2.54,
          header: 0,
          footer: 0,
        },
      };

      worksheet.pageSetup.printArea = 'A1:K24';

      worksheet.getCell('I5').value = issue.user.username;
      worksheet.getCell('C8').value = issue.project.code;
      worksheet.getCell('C9').value = issue.content.trimEnd();
      worksheet.getCell('H8').value = issue.project.name;
      worksheet.getCell('C10').value = dayjs().format('YYYY-MM-DD');

      let currentRow = 12;
      const maxRow = 22;

      for (const item of issue.procurement.items) {
        if (currentRow > maxRow) break;

        worksheet.getCell(`A${currentRow}`).value = item.item;
        worksheet.getCell(`D${currentRow}`).value = item.quantity;
        worksheet.getCell(`E${currentRow}`).value = item.spec;
        worksheet.getCell(`G${currentRow}`).value = item.unitPrice;
        worksheet.getCell(`H${currentRow}`).value =
          item.supplier?.name ?? item.purchaseUrl;

        currentRow++;
      }

      const xlsxBuffer = await workbook.xlsx.writeBuffer();

      const form = new FormData();
      form.append('files', xlsxBuffer, {
        filename: `${PATH_FILENAME}.xlsx`,
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      // PDF 변환 시 여백 제거를 위한 파라미터 추가
      // nativePdfFormat을 false로 설정하여 LibreOffice의 기본 PDF 엔진 사용
      form.append('nativePdfFormat', 'false');
      // singlePageSheets를 true로 설정하여 각 시트를 단일 페이지로 처리
      form.append('singlePageSheets', 'true');

      const url = this.configService.url.docConverter;

      const response = await axios.post(
        `${url}/forms/libreoffice/convert`,
        form,
        {
          headers: {
            ...form.getHeaders(),
          },
          responseType: 'arraybuffer',
          timeout: 30000,
        },
      );

      const buffer = response.data;
      const filename = `${PATH_FILENAME}.pdf`;

      return { buffer, filename };
    } catch (e) {
      throw e;
    }
  }

  async getContractItems(id: number) {
    const items = await this.contractIssueItemRepository
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.project', 'project')
      .where('project.id = :id', { id })
      .orderBy('item.createdAt', 'ASC')
      .getMany();

    return plainToInstance(ContractIssueItemDto, items, {
      excludeExtraneousValues: true,
    });
  }

  async getTransactionItems(id: number) {
    const items = await this.transactionIssueItemRepository
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.project', 'project')
      .leftJoinAndSelect('item.category', 'category')
      .where('project.id = :id', { id })
      .orderBy('item.createdAt', 'ASC')
      .getMany();

    return plainToInstance(TransactionIssueItemDto, items, {
      excludeExtraneousValues: true,
    });
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
      .leftJoinAndSelect('contract.currency', 'currency')
      .where('project.id = :id', { id })
      .getOne();

    if (!issue) return null;

    const issueDto = plainToInstance(
      ContractIssueDto,
      { ...issue, currency: issue.contract?.currency },
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
      .where('project.id = :id', { id })
      .getOne();

    if (!issue) return null;

    const contract = await this.dataSource.manager.findOne(ContractIssue, {
      where: { project: { id: issue.project.id }, deletedAt: null },
      relations: ['currency'],
    });

    const issueDto = plainToInstance(
      TransactionIssueDto,
      {
        ...issue,
        currency: contract?.currency,
      },
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

  async getApprovalIssues(value: GetIssuesDto) {
    const [issues, total] = await this.issueRepository
      .createQueryBuilder('issue')
      .leftJoinAndSelect('issue.project', 'project')
      .leftJoinAndSelect('issue.category', 'category')
      .leftJoinAndSelect('issue.user', 'user')
      .leftJoinAndSelect('user.position', 'position')
      .leftJoinAndSelect('user.department', 'department')
      .leftJoinAndSelect('issue.attachments', 'attachments')
      .innerJoinAndSelect('issue.approval', 'approval')
      .where('project.id = :id', { id: value.projectId })
      .orderBy('issue.createdAt', 'DESC')
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
      .orderBy('issue.createdAt', 'DESC')
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
      .leftJoinAndSelect('issue.procurement', 'procurement')
      .leftJoinAndSelect('procurement.items', 'procurementItems')
      .leftJoinAndSelect('procurementItems.supplier', 'supplier')
      .where('issue.id = :id', { id })
      .getOne();

    return await this.mapIssueToDto(issue);
  }

  async sendMail(id: number, userIds?: number[]) {
    const issue = await this.issueRepository
      .createQueryBuilder('issue')
      .leftJoinAndSelect('issue.project', 'project')
      .leftJoinAndSelect('project.client', 'client')
      .leftJoinAndSelect('project.manager', 'manager')
      .leftJoinAndSelect('issue.category', 'category')
      .leftJoinAndSelect('issue.user', 'user')
      .leftJoinAndSelect('user.position', 'position')
      .leftJoinAndSelect('user.department', 'department')
      .leftJoinAndSelect('issue.attachments', 'attachments')
      .leftJoinAndSelect('issue.contract', 'contract')
      .leftJoinAndSelect('contract.currency', 'currency')
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

    await this.mailService.sendIssueMail(projectDto, issueDto, userIds);
  }

  async createContractIssue(user: User, body: CreateContractIssueDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const project = await queryRunner.manager.findOne(Project, {
        where: { id: body.projectId },
      });
      if (!project) throw new NotFoundException('project_not_found');

      // 2️⃣ 카테고리 조회
      const category = await queryRunner.manager.findOne(IssueCategory, {
        where: { id: body.categoryId },
      });
      if (!category) throw new NotFoundException('category_not_found');

      const existingContract = await queryRunner.manager.findOne(
        ContractIssue,
        {
          where: {
            project: { id: body.projectId },
          },
        },
      );
      if (existingContract) {
        throw new ConflictException('contract_issue_exists');
      }

      const currency = await queryRunner.manager.findOne(Currency, {
        where: { id: body.currencyId },
      });

      const issue = await queryRunner.manager.create(Issue, {
        project,
        category,
        user,
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
            isPaid: dto.isPaid ?? false,
            paidAt: dto.paidAt ?? null,
            note: dto.note ?? null,
          });
        }),
      );
      await queryRunner.manager.save(transactionItems);

      await queryRunner.manager.update(
        Project,
        { id: project.id },
        { latestCategory: category },
      );

      await queryRunner.commitTransaction();
      return await this.mapIssueToDto(savedIssue);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async createKickoffIssue(user: User, body: CreateKickoffIssueDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const project = await queryRunner.manager.findOne(Project, {
        where: { id: body.projectId },
      });
      if (!project) throw new NotFoundException('project_not_found');

      const category = await queryRunner.manager.findOne(IssueCategory, {
        where: { id: body.categoryId },
      });
      if (!category) throw new NotFoundException('category_not_found');

      const existingKickoff = await queryRunner.manager.findOne(KickoffIssue, {
        where: {
          project: { id: body.projectId },
        },
      });
      if (existingKickoff) {
        throw new ConflictException('kickoff_issue_exists');
      }

      const issue = await queryRunner.manager.create(Issue, {
        project,
        category,
        user,
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

      await queryRunner.manager.update(
        Project,
        { id: project.id },
        { latestCategory: category },
      );

      await queryRunner.commitTransaction();
      return await this.mapIssueToDto(savedIssue);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async createApprovalIssue(user: User, body: CreateApprovalIssueDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const project = await queryRunner.manager.findOne(Project, {
        where: { id: body.projectId },
      });
      if (!project) throw new NotFoundException('project_not_found');

      // 2️⃣ 카테고리 조회
      const category = await queryRunner.manager.findOne(IssueCategory, {
        where: { id: body.categoryId },
      });
      if (!category) throw new NotFoundException('category_not_found');

      const issue = await queryRunner.manager.create(Issue, {
        project,
        category,
        user,
        content: body.content,
      });
      const savedIssue = await queryRunner.manager.save(issue);

      const approval = await queryRunner.manager.create(ApprovalIssue, {
        issue: savedIssue,
        project,
      });
      const savedApproval = await queryRunner.manager.save(approval);
      savedIssue.approval = savedApproval;

      await queryRunner.manager.update(
        Project,
        { id: project.id },
        { latestCategory: category },
      );

      await queryRunner.commitTransaction();
      return await this.mapIssueToDto(savedIssue);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async createProcurementIssue(user: User, body: CreateProcurementIssueDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const project = await queryRunner.manager.findOne(Project, {
        where: { id: body.projectId },
      });
      if (!project) throw new NotFoundException('project_not_found');

      // 2️⃣ 카테고리 조회
      const category = await queryRunner.manager.findOne(IssueCategory, {
        where: { id: body.categoryId },
      });
      if (!category) throw new NotFoundException('category_not_found');

      const issue = await queryRunner.manager.create(Issue, {
        project,
        category,
        user,
        content: body.content,
      });
      const savedIssue = await queryRunner.manager.save(issue);

      const procurement = await queryRunner.manager.create(ProcurementIssue, {
        issue: savedIssue,
        project,
      });
      const savedProcurement = await queryRunner.manager.save(procurement);

      const items = await Promise.all(
        body.procurementItems.map(async (dto) =>
          queryRunner.manager.create(ProcurementIssueItem, {
            procurement: savedProcurement,
            ...dto,
            supplier: dto.supplierId
              ? await queryRunner.manager.findOne(Supplier, {
                  where: { id: dto.supplierId },
                })
              : null,
          }),
        ),
      );
      savedProcurement.items = items;
      await queryRunner.manager.save(savedProcurement);

      savedIssue.procurement = savedProcurement;

      await queryRunner.manager.update(
        Project,
        { id: project.id },
        { latestCategory: category },
      );

      await queryRunner.commitTransaction();
      return await this.mapIssueToDto(savedIssue);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async createTransactionIssue(user: User, body: CreateTransactionIssueDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const project = await queryRunner.manager.findOne(Project, {
        where: { id: body.projectId },
      });
      if (!project) throw new NotFoundException('project_not_found');

      const category = await queryRunner.manager.findOne(IssueCategory, {
        where: { id: body.categoryId },
      });
      if (!category) throw new NotFoundException('category_not_found');

      const existingTransaction = await queryRunner.manager.findOne(
        TransactionIssue,
        {
          where: {
            project: { id: body.projectId },
          },
        },
      );
      if (existingTransaction) {
        throw new ConflictException('transaction_issue_exists');
      }

      const issue = await queryRunner.manager.create(Issue, {
        project,
        category,
        user,
        content: body.content,
      });
      const savedIssue = await queryRunner.manager.save(issue);

      const transaction = await queryRunner.manager.create(TransactionIssue, {
        issue: savedIssue,
        project,
      });
      const savedTransaction = await queryRunner.manager.save(transaction);
      savedIssue.transaction = savedTransaction;

      await queryRunner.manager.update(
        Project,
        { id: project.id },
        { latestCategory: category },
      );

      await queryRunner.commitTransaction();
      return await this.mapIssueToDto(savedIssue);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async createPaymentIssue(user: User, body: CreatePaymentIssueDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const project = await queryRunner.manager.findOne(Project, {
        where: { id: body.projectId },
      });
      if (!project) throw new NotFoundException('project_not_found');

      // 2️⃣ 카테고리 조회
      const category = await queryRunner.manager.findOne(IssueCategory, {
        where: { id: body.categoryId },
      });
      if (!category) throw new NotFoundException('category_not_found');

      const existingPayment = await queryRunner.manager.findOne(PaymentIssue, {
        where: {
          project: { id: body.projectId },
        },
      });
      if (existingPayment) {
        throw new ConflictException('payment_issue_exists');
      }

      const issue = await queryRunner.manager.create(Issue, {
        project,
        category,
        user,
        content: body.content,
      });
      const savedIssue = await queryRunner.manager.save(issue);

      const payment = await queryRunner.manager.create(PaymentIssue, {
        issue: savedIssue,
        project,
      });
      const savedPayment = await queryRunner.manager.save(payment);
      savedIssue.approval = savedPayment;

      await queryRunner.manager.update(
        Project,
        { id: project.id },
        { latestCategory: category },
      );

      await queryRunner.commitTransaction();
      return await this.mapIssueToDto(savedIssue);
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
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const issue = await queryRunner.manager.findOne(Issue, {
        where: { id },
        relations: ['project', 'user', 'category', 'contract', 'attachments'],
      });
      if (!issue) throw new NotFoundException('issue_not_found');

      if (issue.user.id !== user.id && !user.isAdmin) {
        throw new ForbiddenException('no_permission');
      }

      // Currency 업데이트
      if (body.currencyId) {
        const currency = await queryRunner.manager.findOne(Currency, {
          where: { id: body.currencyId },
        });
        if (currency) {
          issue.contract.currency = currency;
        }
      }

      // Content 업데이트
      if (body.content) {
        issue.content = body.content;
      }

      // Attachments 업데이트
      if (body.attachments) {
        const oldAttachments = issue.attachments || [];
        const toRemove = oldAttachments.filter(
          (oldAtt) =>
            !body.attachments.some((newAtt) => newAtt.id === oldAtt.id),
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
        const newAttachments = body.attachments
          .filter((att) => !issue.attachments?.some((old) => old.id === att.id))
          .map((att) =>
            queryRunner.manager.create(IssueAttachment, {
              filename: att.filename,
              path: att.path,
              size: att.size,
              issue: issue,
            }),
          );

        issue.attachments = [...remainingAttachments, ...newAttachments];
      }

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
                existing.isPaid = dto.isPaid;
                existing.paidAt = dto.paidAt
                  ? dayjs(dto.paidAt).toDate()
                  : null;
                existing.note = dto.note;
                return existing;
              }
            }

            return queryRunner.manager.create(TransactionIssueItem, {
              project: issue.project,
              category,
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
      const saved = await queryRunner.manager.save(issue);

      await queryRunner.commitTransaction();
      return await this.mapIssueToDto(saved);
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
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const issue = await queryRunner.manager.findOne(Issue, {
        where: { id },
        relations: ['project', 'user', 'category', 'kickoff', 'attachments'],
      });
      if (!issue) throw new NotFoundException('issue_not_found');

      if (issue.user.id !== user.id && !user.isAdmin) {
        throw new ForbiddenException('no_permission');
      }

      if (body.kickoffDate) {
        issue.kickoff.kickoffDate = body.kickoffDate;
        await queryRunner.manager.save(issue.kickoff);
      }

      if (body.content) {
        issue.content = body.content;
      }

      if (body.attachments) {
        const oldAttachments = issue.attachments || [];
        const toRemove = oldAttachments.filter(
          (oldAtt) =>
            !body.attachments.some((newAtt) => newAtt.id === oldAtt.id),
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
        const newAttachments = body.attachments
          .filter((att) => !issue.attachments?.some((old) => old.id === att.id))
          .map((att) =>
            queryRunner.manager.create(IssueAttachment, {
              filename: att.filename,
              path: att.path,
              size: att.size,
              issue: issue,
            }),
          );

        issue.attachments = [...remainingAttachments, ...newAttachments];
      }

      const saved = await queryRunner.manager.save(issue);

      await queryRunner.commitTransaction();
      return await this.mapIssueToDto(saved);
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
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const issue = await queryRunner.manager.findOne(Issue, {
        where: { id },
        relations: ['project', 'user', 'category', 'approval', 'attachments'],
      });
      if (!issue) throw new NotFoundException('issue_not_found');

      if (issue.user.id !== user.id && !user.isAdmin) {
        throw new ForbiddenException('no_permission');
      }

      if (body.content) {
        issue.content = body.content;
      }

      if (body.attachments) {
        const oldAttachments = issue.attachments || [];
        const toRemove = oldAttachments.filter(
          (oldAtt) =>
            !body.attachments.some((newAtt) => newAtt.id === oldAtt.id),
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
        const newAttachments = body.attachments
          .filter((att) => !issue.attachments?.some((old) => old.id === att.id))
          .map((att) =>
            queryRunner.manager.create(IssueAttachment, {
              filename: att.filename,
              path: att.path,
              size: att.size,
              issue: issue,
            }),
          );

        issue.attachments = [...remainingAttachments, ...newAttachments];
      }

      const saved = await queryRunner.manager.save(issue);

      await queryRunner.commitTransaction();
      return await this.mapIssueToDto(saved);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async updateProcurementIssue(
    user: User,
    id: number,
    body: UpdateProcurementIssueDto,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const issue = await queryRunner.manager.findOne(Issue, {
        where: { id },
        relations: [
          'project',
          'user',
          'category',
          'procurement',
          'procurement.items',
          'attachments',
        ],
      });
      if (!issue) throw new NotFoundException('issue_not_found');

      if (issue.user.id !== user.id && !user.isAdmin) {
        throw new ForbiddenException('no_permission');
      }

      if (body.content) {
        issue.content = body.content;
      }

      if (body.attachments) {
        const oldAttachments = issue.attachments || [];
        const toRemove = oldAttachments.filter(
          (oldAtt) =>
            !body.attachments.some((newAtt) => newAtt.id === oldAtt.id),
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
        const newAttachments = body.attachments
          .filter((att) => !issue.attachments?.some((old) => old.id === att.id))
          .map((att) =>
            queryRunner.manager.create(IssueAttachment, {
              filename: att.filename,
              path: att.path,
              size: att.size,
              issue: issue,
            }),
          );

        issue.attachments = [...remainingAttachments, ...newAttachments];
      }

      if (body.procurementItems) {
        const existingItems = await queryRunner.manager.find(
          ProcurementIssueItem,
          {
            where: { procurement: { id: issue.procurement.id } },
          },
        );

        const toRemove = existingItems.filter(
          (e) => !body.procurementItems.some((dto) => dto.id === e.id),
        );
        if (toRemove.length) {
          await queryRunner.manager.softDelete(
            ProcurementIssueItem,
            toRemove.map((item) => item.id),
          );
        }

        const items = await Promise.all(
          body.procurementItems.map(async (dto) => {
            if (dto.id) {
              const existing = existingItems.find((e) => e.id === dto.id);
              if (existing) {
                existing.item = dto.item;
                existing.spec = dto.spec;
                existing.quantity = dto.quantity;
                existing.unitPrice = dto.unitPrice;
                existing.totalAmount = dto.totalAmount;
                existing.isOnlinePurchase = dto.isOnlinePurchase;
                existing.purchaseUrl = dto.purchaseUrl;

                // ⭐ supplier 유지 / 변경 로직
                if (dto.supplierId !== undefined) {
                  existing.supplier = dto.supplierId
                    ? await queryRunner.manager.findOne(Supplier, {
                        where: { id: dto.supplierId },
                      })
                    : null;
                }

                return existing;
              }
            }

            return queryRunner.manager.create(ProcurementIssueItem, {
              procurement: issue.procurement,
              item: dto.item,
              spec: dto.spec,
              quantity: dto.quantity,
              unitPrice: dto.unitPrice,
              totalAmount: dto.totalAmount,
              isOnlinePurchase: dto.isOnlinePurchase,
              purchaseUrl: dto.purchaseUrl,
              supplier: dto.supplierId
                ? await queryRunner.manager.findOne(Supplier, {
                    where: { id: dto.supplierId },
                  })
                : null,
            });
          }),
        );

        const savedItems = await queryRunner.manager.save(items);
        issue.procurement.items = savedItems;
      }

      const saved = await queryRunner.manager.save(issue);

      await queryRunner.commitTransaction();
      return await this.mapIssueToDto(saved);
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
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const issue = await queryRunner.manager.findOne(Issue, {
        where: { id },
        relations: [
          'project',
          'user',
          'category',
          'transaction',
          'attachments',
        ],
      });
      if (!issue) throw new NotFoundException('issue_not_found');

      if (issue.user.id !== user.id && !user.isAdmin) {
        throw new ForbiddenException('no_permission');
      }

      if (body.content) {
        issue.content = body.content;
      }

      if (body.attachments) {
        const oldAttachments = issue.attachments || [];
        const toRemove = oldAttachments.filter(
          (oldAtt) =>
            !body.attachments.some((newAtt) => newAtt.id === oldAtt.id),
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
        const newAttachments = body.attachments
          .filter((att) => !issue.attachments?.some((old) => old.id === att.id))
          .map((att) =>
            queryRunner.manager.create(IssueAttachment, {
              filename: att.filename,
              path: att.path,
              size: att.size,
              issue: issue,
            }),
          );

        issue.attachments = [...remainingAttachments, ...newAttachments];
      }

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
                existing.isPaid = dto.isPaid;
                existing.paidAt = dto.paidAt
                  ? dayjs(dto.paidAt).toDate()
                  : null;
                existing.note = dto.note;
                return existing;
              }
            }

            return queryRunner.manager.create(TransactionIssueItem, {
              project: issue.project,
              category,
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
      const saved = await queryRunner.manager.save(issue);

      await queryRunner.commitTransaction();
      return await this.mapIssueToDto(saved);
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
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const issue = await queryRunner.manager.findOne(Issue, {
        where: { id },
        relations: ['project', 'user', 'category', 'payment', 'attachments'],
      });
      if (!issue) throw new NotFoundException('issue_not_found');

      if (issue.user.id !== user.id && !user.isAdmin) {
        throw new ForbiddenException('no_permission');
      }

      if (body.content) {
        issue.content = body.content;
      }

      if (body.attachments) {
        const oldAttachments = issue.attachments || [];
        const toRemove = oldAttachments.filter(
          (oldAtt) =>
            !body.attachments.some((newAtt) => newAtt.id === oldAtt.id),
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
        const newAttachments = body.attachments
          .filter((att) => !issue.attachments?.some((old) => old.id === att.id))
          .map((att) =>
            queryRunner.manager.create(IssueAttachment, {
              filename: att.filename,
              path: att.path,
              size: att.size,
              issue: issue,
            }),
          );

        issue.attachments = [...remainingAttachments, ...newAttachments];
      }

      const saved = await queryRunner.manager.save(issue);

      await queryRunner.commitTransaction();
      return await this.mapIssueToDto(saved);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // async updateIssue(user: any, id: number, body: UpdateIssueDto) {
  //   const queryRunner = this.dataSource.createQueryRunner();
  //   await queryRunner.connect();
  //   await queryRunner.startTransaction();

  //   try {
  //     // Issue 조회 (relations 포함)
  //     const issue = await queryRunner.manager.findOne(Issue, {
  //       where: { id },
  //       relations: [
  //         'project',
  //         'user',
  //         'category',
  //         'attachments',
  //         'contract',
  //         'kickoff',
  //         'approval',
  //         'procurement',
  //         'procurement.items',
  //         'transaction',
  //         'approval',
  //         'payment',
  //       ],
  //     });

  //     if (!issue) throw new NotFoundException('issue_not_found');

  //     if (issue.user.id !== user.id && !user.isAdmin) {
  //       throw new ForbiddenException('no_permission');
  //     }

  //     if (body.currencyId) {
  //       const currency = await queryRunner.manager.findOne(Currency, {
  //         where: { id: body.currencyId },
  //       });
  //       if (currency) {
  //         // 현재 객체 업데이트
  //         issue.currency = currency;
  //         // [핵심] 같은 프로젝트의 모든 이슈 통화를 한꺼번에 변경하여 정합성 유지
  //         await queryRunner.manager.update(
  //           Issue,
  //           { project: { id: issue.project.id } },
  //           { currency: currency },
  //         );
  //       }
  //     }

  //     // 1️⃣ content 업데이트
  //     if (typeof body.content === 'string') issue.content = body.content;

  //     // 2️⃣ attachments 업데이트
  //     if (body.attachments) {
  //       const oldAttachments = issue.attachments || [];
  //       const toRemove = oldAttachments.filter(
  //         (oldAtt) =>
  //           !body.attachments.some((newAtt) => newAtt.id === oldAtt.id),
  //       );

  //       for (const att of toRemove) {
  //         try {
  //           await this.sftpService.deleteFileByPath(att.path);
  //         } catch (e) {
  //           console.warn(`SFTP 삭제 실패: ${att.path}`, e);
  //         }
  //       }

  //       if (toRemove.length > 0) {
  //         await queryRunner.manager.remove(IssueAttachment, toRemove);
  //       }

  //       const remainingAttachments = oldAttachments.filter(
  //         (att) => !toRemove.includes(att),
  //       );
  //       const newAttachments = body.attachments
  //         .filter((att) => !issue.attachments?.some((old) => old.id === att.id))
  //         .map((att) =>
  //           queryRunner.manager.create(IssueAttachment, {
  //             filename: att.filename,
  //             path: att.path,
  //             size: att.size,
  //             issue: issue,
  //           }),
  //         );

  //       issue.attachments = [...remainingAttachments, ...newAttachments];
  //     }

  //     // 3️⃣ OneToOne 관계 생성 및 업데이트
  //     if (issue.category.id === 1) {
  //       // CONTRACT
  //       if (!issue.contract) {
  //         issue.contract = await queryRunner.manager.save(
  //           queryRunner.manager.create(ContractIssue, { issue }),
  //         );
  //       }
  //       if (body.currencyId) {
  //         const currency = await queryRunner.manager.findOne(Currency, {
  //           where: { id: body.currencyId },
  //         });
  //         if (currency) issue.currency = currency;
  //       }
  //     } else if (issue.category.id === 2) {
  //       // KICKOFF
  //       if (!issue.kickoff) {
  //         issue.kickoff = await queryRunner.manager.save(
  //           queryRunner.manager.create(KickoffIssue, { issue }),
  //         );
  //       }
  //       if (body.kickoffDate) issue.kickoff.kickoffDate = body.kickoffDate;
  //     } else if (issue.category.id === 4) {
  //       // PROCUREMENT
  //       if (!issue.procurement) {
  //         issue.procurement = await queryRunner.manager.save(
  //           queryRunner.manager.create(ProcurementIssue, { issue }),
  //         );
  //       }
  //       if (body.procurementItems) {
  //         const existingItems = issue.procurement.items ?? [];

  //         // 삭제 처리
  //         const toRemove = existingItems.filter(
  //           (e) => !body.procurementItems.some((dto) => dto.id === e.id),
  //         );
  //         if (toRemove.length) {
  //           await queryRunner.manager.remove(toRemove);
  //         }

  //         const items = await Promise.all(
  //           body.procurementItems.map(async (dto) => {
  //             if (dto.id) {
  //               const existing = existingItems.find((e) => e.id === dto.id);
  //               if (existing) {
  //                 existing.item = dto.item;
  //                 existing.spec = dto.spec;
  //                 existing.quantity = dto.quantity;
  //                 existing.unitPrice = dto.unitPrice;
  //                 existing.totalAmount = dto.totalAmount;
  //                 existing.isOnlinePurchase = dto.isOnlinePurchase;
  //                 existing.purchaseUrl = dto.purchaseUrl;

  //                 // ⭐ supplier 유지 / 변경 로직
  //                 if (dto.supplierId !== undefined) {
  //                   existing.supplier = dto.supplierId
  //                     ? await queryRunner.manager.findOne(Supplier, {
  //                         where: { id: dto.supplierId },
  //                       })
  //                     : null;
  //                 }

  //                 return existing;
  //               }
  //             }

  //             // 신규 생성
  //             return queryRunner.manager.create(ProcurementIssueItem, {
  //               procurement: issue.procurement,
  //               item: dto.item,
  //               spec: dto.spec,
  //               quantity: dto.quantity,
  //               unitPrice: dto.unitPrice,
  //               totalAmount: dto.totalAmount,
  //               isOnlinePurchase: dto.isOnlinePurchase,
  //               purchaseUrl: dto.purchaseUrl,
  //               supplier: dto.supplierId
  //                 ? await queryRunner.manager.findOne(Supplier, {
  //                     where: { id: dto.supplierId },
  //                   })
  //                 : null,
  //             });
  //           }),
  //         );

  //         issue.procurement.items = items;
  //         await queryRunner.manager.save(issue.procurement);
  //       }
  //     } else if (issue.category.id === 5) {
  //       // TRANSACTION
  //       if (!issue.transaction) {
  //         issue.transaction = await queryRunner.manager.save(
  //           queryRunner.manager.create(TransactionIssue, { issue }),
  //         );
  //       }
  //     }

  //     // 4️⃣ contractItems (독립 컬렉션) 업데이트
  //     if (body.contractItems) {
  //       const existingItems = await queryRunner.manager.find(
  //         ContractIssueItem,
  //         {
  //           where: { project: { id: issue.project.id } },
  //         },
  //       );

  //       const toRemove = existingItems.filter(
  //         (e) => !body.contractItems.some((dto) => dto.id === e.id),
  //       );
  //       if (toRemove.length) await queryRunner.manager.remove(toRemove);

  //       const items = body.contractItems.map((dto) => {
  //         if (dto.id) {
  //           const existing = existingItems.find((e) => e.id === dto.id);
  //           if (existing) {
  //             existing.item = dto.item;
  //             existing.price = dto.price;
  //             return existing;
  //           }
  //         }
  //         return queryRunner.manager.create(ContractIssueItem, {
  //           project: issue.project,
  //           item: dto.item,
  //           price: dto.price,
  //         });
  //       });

  //       await queryRunner.manager.save(items);
  //     }

  //     // 5️⃣ transactionItems (독립 컬렉션) 업데이트
  //     if (body.transactionItems) {
  //       const existingItems = await queryRunner.manager.find(
  //         TransactionIssueItem,
  //         {
  //           where: { project: { id: issue.project.id } },
  //         },
  //       );

  //       const toRemove = existingItems.filter(
  //         (e) => !body.transactionItems.some((dto) => dto.id === e.id),
  //       );
  //       if (toRemove.length) await queryRunner.manager.remove(toRemove);

  //       const items = await Promise.all(
  //         body.transactionItems.map(async (dto) => {
  //           const category = await queryRunner.manager.findOne(
  //             TransactionIssueItemCategory,
  //             { where: { id: dto.categoryId } },
  //           );

  //           if (dto.id) {
  //             const existing = existingItems.find((e) => e.id === dto.id);
  //             if (existing) {
  //               existing.category = category;
  //               existing.price = dto.price;
  //               existing.ratio = dto.ratio;
  //               existing.isPaid = dto.isPaid;
  //               existing.paidAt = dto.paidAt
  //                 ? dayjs(dto.paidAt).toDate()
  //                 : null;
  //               existing.note = dto.note;
  //               return existing;
  //             }
  //           }

  //           return queryRunner.manager.create(TransactionIssueItem, {
  //             project: issue.project,
  //             category,
  //             price: dto.price,
  //             ratio: dto.ratio,
  //             isPaid: dto.isPaid ?? false,
  //             paidAt: dto.paidAt ?? null,
  //             note: dto.note ?? null,
  //           });
  //         }),
  //       );

  //       await queryRunner.manager.save(items);
  //     }

  //     // 6️⃣ 최종 issue 저장
  //     const saved = await queryRunner.manager.save(issue);
  //     await queryRunner.commitTransaction();

  //     return await this.mapIssueToDto(saved);
  //   } catch (err) {
  //     await queryRunner.rollbackTransaction();
  //     throw err;
  //   } finally {
  //     await queryRunner.release();
  //   }
  // }

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
        .leftJoinAndSelect('contract.currency', 'currency')
        .leftJoinAndSelect('issue.transaction', 'transaction')
        .leftJoinAndSelect('issue.kickoff', 'kickoff')
        .leftJoinAndSelect('issue.payment', 'payment')
        .leftJoinAndSelect('issue.procurement', 'procurement')
        .leftJoinAndSelect('procurement.items', 'procurementItems')
        .leftJoinAndSelect('procurementItems.supplier', 'supplier')
        .where('issue.id = :id', { id })
        .getOne();

      const issueDto = await this.mapIssueToDto(issue);

      if (!issue) {
        throw new NotFoundException('issue_not_found');
      }

      if (issue.user.id !== user.id && !user.isAdmin) {
        throw new ForbiddenException('no_permission');
      }

      const projectId = issue.project.id;

      // Attachments 아카이브 및 soft delete
      if (issue.attachments?.length) {
        // SFTP에서 파일 아카이브
        for (const att of issue.attachments) {
          try {
            await this.sftpService.archiveFileByPath(att.path);
          } catch (e) {
            console.warn(`파일 아카이브 실패: ${att.path}`, e);
          }
        }
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

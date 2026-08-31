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
import { DataSource, EntityManager, Repository } from 'typeorm';
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
import { assertWriteAccess } from '@/common/policies/write-access.policy';
import { assertOwnerOrAdmin } from '@/common/policies/resource-access.policy';
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
import { ProcurementIssueRequestItem } from '@/entity/issue/procurement/procurement-issue-request-item.entity';
import {
  CreateProcurementRequestDto,
  UpdateProcurementRequestDto,
} from './dto/procurement-issue-request';
import { ProcurementIssueRequest } from '@/entity/issue/procurement/procurement-issue-request.entity';
import { convertToKoreanCurrency } from '@/common/utils/converter.util';
import { extractImages } from '@/common/utils/markdown.util';
import {
  assertIssueCategory,
  shouldAdvanceLatestCategory,
} from './issue-category.util';

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
    @InjectRepository(ProcurementIssueRequest)
    private readonly procurementIssueRequestRepository: Repository<ProcurementIssueRequest>,
    private readonly projectClientService: ProjectClientService,
    private readonly mailService: MailService,
    private readonly sftpService: SftpService,
    @Inject(config.KEY)
    private configService: ConfigType<typeof config>,
  ) {}

  private async findAndLockProject(manager: EntityManager, projectId: number) {
    const project = await manager
      .createQueryBuilder(Project, 'project')
      .leftJoinAndSelect('project.latestCategory', 'latestCategory')
      .where('project.id = :projectId', { projectId })
      .setLock('pessimistic_write', undefined, ['project'])
      .getOne();

    if (!project) throw new NotFoundException('not_found_project');
    return project;
  }

  private async findIssueCategory(
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

  private async advanceLatestCategory(
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

  private async mapIssueToDto(issue: Issue) {
    if (!issue) return null;

    const contract = await this.dataSource.manager.findOne(ContractIssue, {
      where: { project: { id: issue.project.id }, deletedAt: null },
      relations: ['currency'],
    });

    const contractItems = await this.contractIssueItemRepository.find({
      where: { project: { id: issue.project.id }, deletedAt: null },
      relations: ['project'],
    });

    const transactionItems = await this.transactionIssueItemRepository.find({
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

  async getLatestIssues(value: GetLatestIssuesDto) {
    const [issues, total] = await this.issueRepository
      .createQueryBuilder('issue')
      .leftJoinAndSelect('issue.project', 'project')
      .leftJoinAndSelect('issue.category', 'category')
      .leftJoinAndSelect('issue.createdBy', 'createdBy')
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

  async exportPurchaseRequest(id: number, user: User) {
    const TEMPLATE_BASE_PATH = path.join(process.cwd(), 'templates');
    const TEMPLATE_FILE_NAME = 'request_template.xlsx';

    const PATH_FILENAME = `request_${id}_filled`;
    const TEMPLATE_PATH = path.join(TEMPLATE_BASE_PATH, TEMPLATE_FILE_NAME);

    const issue = await this.issueRepository
      .createQueryBuilder('issue')
      .leftJoinAndSelect('issue.project', 'project')
      .leftJoinAndSelect('issue.createdBy', 'createdBy')
      .innerJoinAndSelect('issue.procurement', 'procurement')
      .leftJoinAndSelect('procurement.items', 'items')
      .leftJoinAndSelect('items.supplier', 'supplier')
      .where('issue.id = :id', { id })
      .getOne();
    if (!issue) throw new NotFoundException('not_found_issue');

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(TEMPLATE_PATH);

      const worksheet = workbook.worksheets[0];

      worksheet.pageSetup = {
        paperSize: 9, // A4
        orientation: 'portrait',

        // fitToPage를 true로 하되, 가로/세로 페이지 수를 명시하여 템플릿 규격에 맞춤
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 1,

        horizontalCentered: true,
        verticalCentered: true,

        // 여백을 원하는 크기로 조정 (예: 상하좌우 1.5cm 정도 여백을 원할 경우 1.5 / 2.54)
        margins: {
          left: 1.5 / 2.54,
          right: 1.5 / 2.54,
          top: 1.5 / 2.54,
          bottom: 1.5 / 2.54,
          header: 0,
          footer: 0,
        },
      };

      worksheet.pageSetup.printArea = 'A1:N32';

      worksheet.getCell('L5').value = issue.createdBy.username;
      worksheet.getCell('C8').value = issue.project.code;
      worksheet.getCell('J8').value = issue.project.name;
      worksheet.getCell('C9').value = issue.content.trimEnd();
      worksheet.getCell('C10').value = dayjs().format('YYYY-MM-DD');

      let currentRow = 12;
      const maxRow = 22;

      let total = 0;

      for (const item of issue.procurement.items) {
        if (currentRow > maxRow) break;

        worksheet.getCell(`A${currentRow}`).value = item.item;
        worksheet.getCell(`D${currentRow}`).value = item.spec;
        worksheet.getCell(`F${currentRow}`).value = item.quantity;
        worksheet.getCell(`G${currentRow}`).value = item.unitPrice;
        worksheet.getCell(`H${currentRow}`).value = item.totalAmount;
        worksheet.getCell(`I${currentRow}`).value =
          item.supplier?.name ?? item.purchaseUrl;
        worksheet.getCell(`L${currentRow}`).value = item.note;

        total += item.totalAmount;
        currentRow++;
      }

      worksheet.getCell('L32').value = total;

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
      // singlePageSheets=true는 강제 스케일링되어 중앙 정렬이 무력화될 수 있음
      form.append('singlePageSheets', 'false');

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

  async exportPurchaseOrder(id: number) {
    const TEMPLATE_BASE_PATH = path.join(process.cwd(), 'templates');
    const TEMPLATE_FILE_NAME = 'order_template.xlsx';

    const PATH_FILENAME = `order_${id}_filled`;
    const TEMPLATE_PATH = path.join(TEMPLATE_BASE_PATH, TEMPLATE_FILE_NAME);

    const request = await this.procurementIssueRequestRepository.findOne({
      where: { id },
      relations: ['items', 'supplier', 'approvedBy', 'approvedBy.rank'],
    });
    if (!request) throw new NotFoundException('not_found_procurement_request');

    if (request.requiresApproval != request.isApproved) {
      throw new ForbiddenException('forbidden_ceo_approval_required');
    }

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(TEMPLATE_PATH);

      const worksheet = workbook.worksheets[0];

      worksheet.pageSetup = {
        paperSize: 9, // A4
        orientation: 'portrait',

        // fitToPage를 true로 하되, 가로/세로 페이지 수를 명시하여 템플릿 규격에 맞춤
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 1,

        horizontalCentered: true,
        verticalCentered: true,

        // 여백을 원하는 크기로 조정 (예: 상하좌우 1.5cm 정도 여백을 원할 경우 1.5 / 2.54)
        margins: {
          left: 1.5 / 2.54,
          right: 1.5 / 2.54,
          top: 1.5 / 2.54,
          bottom: 1.5 / 2.54,
          header: 0,
          footer: 0,
        },
      };

      worksheet.pageSetup.printArea = 'A1:N40';

      worksheet.getCell('D6').value = dayjs(request.orderDate).format(
        'YYYY/MM/DD',
      );
      worksheet.getCell('D7').value = request.supplier.name;
      if (request.deliveryDate !== null)
        worksheet.getCell('D8').value = dayjs(request.deliveryDate).format(
          'YYYY/MM/DD',
        );
      else worksheet.getCell('D8').value = '별도 협의';
      worksheet.getCell('D9').value = request.paymentTerms ?? '별도 협의';
      worksheet.getCell('D10').value = request.supplier.phone;
      worksheet.getCell('D11').value = request.title;
      worksheet.getCell('D12').value = request.serialNumber;

      const subtotal = request.items.reduce(
        (sum, item) => sum + (item.totalAmount ?? 0),
        0,
      );
      const vatAmount = request.hasFee ? subtotal / 10 : 0;
      const total = subtotal + vatAmount;
      const formattedTotal = new Intl.NumberFormat('ko-KR').format(total);

      worksheet.getCell('A14').value =
        `금 액 : ${convertToKoreanCurrency(total)} 정`;
      if (request.hasFee)
        worksheet.getCell('H14').value = `(₩ ${formattedTotal}) / VAT 포함)`;
      else worksheet.getCell('H14').value = `(₩ ${formattedTotal}) / VAT 별도)`;

      let currentRow = 18;
      const maxRow = 33;

      let index = 1;
      let quantity = 0;

      for (const item of request.items) {
        if (currentRow > maxRow) break;

        worksheet.getCell(`A${currentRow}`).value = index;
        worksheet.getCell(`B${currentRow}`).value = item.item;
        worksheet.getCell(`F${currentRow}`).value = item.spec;
        worksheet.getCell(`I${currentRow}`).value = item.quantity;
        worksheet.getCell(`J${currentRow}`).value = item.unitPrice;
        worksheet.getCell(`L${currentRow}`).value = item.totalAmount;
        worksheet.getCell(`N${currentRow}`).value = request.hasFee
          ? item.totalAmount / 10
          : 0;

        index++;
        quantity = quantity + item.quantity;
        currentRow++;
      }

      worksheet.getCell('C35').value = quantity;
      worksheet.getCell('E35').value = subtotal;
      worksheet.getCell('H35').value = vatAmount;
      worksheet.getCell('K35').value = total;

      const noteCell = worksheet.getCell('A40');
      noteCell.value = (request.note ?? '').replace(/\r\n/g, '\n');
      noteCell.alignment = {
        ...(noteCell.alignment ?? {}),
        wrapText: true,
      };

      if (request.requiresApproval && request.isApproved) {
        try {
          const signatureImagePath = path.join(
            TEMPLATE_BASE_PATH,
            'signature.png',
          );

          // 1. 통합 문서(Workbook)에 이미지 추가
          const imageId = workbook.addImage({
            filename: signatureImagePath,
            extension: 'png',
          });

          worksheet.addImage(imageId, {
            // N2 셀 내부 여백을 위해 소수점 추가 (col: 13은 N열, row: 1은 2행)
            tl: { col: 13, row: 1.5 },
            ext: { width: 90, height: 90 },
            editAs: 'oneCell', // 셀 크기가 바뀌어도 이미지 크기 유지
          });
        } catch (error) {
          // 파일이 없거나 에러가 나도 PDF 생성 자체는 중단되지 않도록 로그만 출력
          console.error('대표이사 서명 이미지 삽입 실패:', error);
        }
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
      // singlePageSheets=true는 강제 스케일링되어 중앙 정렬이 무력화될 수 있음
      form.append('singlePageSheets', 'false');

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
      .andWhere('item.deletedAt IS NULL')
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
      .andWhere('item.deletedAt IS NULL')
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

  async getProcurementIssues(value: GetIssuesDto) {
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
      .innerJoinAndSelect('issue.procurement', 'procurement')
      .leftJoinAndSelect('procurement.items', 'items')
      .leftJoinAndSelect('items.supplier', 'supplier')
      .leftJoinAndSelect('procurement.requests', 'requests')
      .leftJoinAndSelect('requests.requestedBy', 'requestedBy')
      .leftJoinAndSelect('requests.items', 'requestItem')
      .leftJoinAndSelect('requests.supplier', 'requestSupplier')
      .where('project.id = :id', { id: value.projectId })
      .orderBy('issue.createdAt', 'DESC')
      .addOrderBy('attachment.createdAt', 'DESC')
      .skip((value.page - 1) * value.limit)
      .take(value.limit)
      .getManyAndCount();

    const items = issues.map((issue) => {
      return plainToInstance(
        ProcurementIssueDto,
        {
          ...issue,
          procurementItems: issue.procurement?.items || [],
          requests: issue.procurement?.requests,
        },
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

  async createContractIssue(user: User, body: CreateContractIssueDto) {
    assertWriteAccess(user);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const project = await this.findAndLockProject(
        queryRunner.manager,
        body.projectId,
      );

      // 2️⃣ 카테고리 조회
      const category = await this.findIssueCategory(
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
            isPaid: dto.isPaid ?? false,
            paidAt: dto.paidAt ?? null,
            note: dto.note ?? null,
          });
        }),
      );
      await queryRunner.manager.save(transactionItems);

      await this.advanceLatestCategory(queryRunner.manager, project, category);

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
    assertWriteAccess(user);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const project = await this.findAndLockProject(
        queryRunner.manager,
        body.projectId,
      );

      const category = await this.findIssueCategory(
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

      await this.advanceLatestCategory(queryRunner.manager, project, category);

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
    assertWriteAccess(user);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const project = await this.findAndLockProject(
        queryRunner.manager,
        body.projectId,
      );

      // 2️⃣ 카테고리 조회
      const category = await this.findIssueCategory(
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

      await this.advanceLatestCategory(queryRunner.manager, project, category);

      await queryRunner.commitTransaction();
      return await this.mapIssueToDto(savedIssue);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async createProcurementIssueRequest(
    user: User,
    id: number,
    body: CreateProcurementRequestDto,
  ) {
    assertWriteAccess(user);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const issue = await queryRunner.manager.findOne(Issue, {
        where: { id },
        relations: [
          'project',
          'createdBy',
          'category',
          'procurement',
          'procurement.items',
          'procurement.items.supplier',
          'procurement.requests',
          'procurement.requests.requestedBy',
          'procurement.requests.items',
          'procurement.requests.supplier',
          'attachments',
        ],
      });
      if (!issue) throw new NotFoundException('not_found_issue');

      await queryRunner.manager.save(issue.procurement);

      const totalAmount = body.items.reduce(
        (sum, item) => sum + (item.totalAmount ?? 0),
        0,
      );
      const requiresApproval = totalAmount > 500000;

      const request = await queryRunner.manager.create(
        ProcurementIssueRequest,
        {
          requestedBy: user,
          procurement: issue.procurement,
          title: body.title,
          orderDate: dayjs().toDate(),
          deliveryDate: body.deliveryDate,
          paymentTerms: body.paymentTerms,
          serialNumber: dayjs().format('YYYYMMDDHHmmss'),
          supplier: body.supplierId
            ? await queryRunner.manager.findOne(Supplier, {
                where: { id: body.supplierId },
              })
            : null,
          hasFee: body.hasFee,
          requiresApproval,
          isApproved: false,
          approvedBy: null,
          approvedAt: null,
          note: body.note,
        },
      );

      const savedRequest = await queryRunner.manager.save(request);

      const items = await Promise.all(
        body.items.map(async (dto) =>
          queryRunner.manager.create(ProcurementIssueRequestItem, {
            request: savedRequest,
            ...dto,
            supplier: dto.supplierId
              ? await queryRunner.manager.findOne(Supplier, {
                  where: { id: dto.supplierId },
                })
              : null,
          }),
        ),
      );
      savedRequest.items = items;

      await queryRunner.manager.save(savedRequest);

      issue.procurement.requests = [
        ...(issue.procurement.requests ?? []),
        savedRequest,
      ];

      issue.updatedBy = user;
      const saved = await queryRunner.manager.save(issue);

      await queryRunner.commitTransaction();

      if (requiresApproval) {
        try {
          await this.mailService.sendProcurementApprovalRequestMail({
            projectCode: issue.project.code,
            projectName: issue.project.name,
            projectId: issue.project.id,
            issueId: issue.id,
            serialNumber: savedRequest.serialNumber,
            requesterName: user.username,
            requesterEmail: user.email,
            totalAmount,
          });
        } catch (e) {
          console.warn('발주서 승인 요청 메일 전송 실패', e);
        }
      }

      return await this.mapIssueToDto(saved);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async updateProcurementIssueRequest(
    user: User,
    id: number,
    body: UpdateProcurementRequestDto,
  ) {
    assertWriteAccess(user);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let issueId: number;

    try {
      const request = await queryRunner.manager.findOne(
        ProcurementIssueRequest,
        {
          where: { id },
          relations: [
            'requestedBy',
            'items',
            'procurement',
            'procurement.issue',
            'procurement.issue.createdBy',
          ],
        },
      );

      if (!request) throw new NotFoundException('not_found_procurement_request');

      assertOwnerOrAdmin(user, request.requestedBy.id);

      issueId = request.procurement.issue.id;

      if (body.title !== undefined) request.title = body.title;
      if (body.deliveryDate !== undefined) {
        request.deliveryDate = body.deliveryDate;
      }
      if (body.paymentTerms !== undefined) {
        request.paymentTerms = body.paymentTerms;
      }
      if (body.hasFee !== undefined) request.hasFee = body.hasFee;
      if (body.note !== undefined) request.note = body.note;

      if (body.supplierId !== undefined) {
        request.supplier = body.supplierId
          ? await queryRunner.manager.findOne(Supplier, {
              where: { id: body.supplierId },
            })
          : null;
      }

      const existingItems = await queryRunner.manager.find(
        ProcurementIssueRequestItem,
        {
          where: { request: { id: request.id } },
        },
      );

      const items = body.items.map((dto) => {
        if (dto.id) {
          const existing = existingItems.find((e) => e.id === dto.id);
          if (existing) {
            existing.item = dto.item;
            existing.spec = dto.spec;
            existing.quantity = dto.quantity;
            existing.unitPrice = dto.unitPrice;
            existing.totalAmount = dto.totalAmount;
            existing.note = dto.note;
            return existing;
          }
        }

        return queryRunner.manager.create(ProcurementIssueRequestItem, {
          request,
          item: dto.item,
          spec: dto.spec,
          quantity: dto.quantity,
          unitPrice: dto.unitPrice,
          totalAmount: dto.totalAmount,
          note: dto.note,
        });
      });

      const savedItems = await queryRunner.manager.save(items);
      request.items = savedItems;

      const totalAmount = savedItems.reduce(
        (sum, item) => sum + (item.totalAmount ?? 0),
        0,
      );
      request.requiresApproval = totalAmount > 500000;
      request.isApproved = false;
      request.approvedBy = null;
      request.approvedAt = null;

      await queryRunner.manager.save(request);
      request.procurement.issue.updatedBy = user;
      await queryRunner.manager.save(request.procurement.issue);

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }

    return await this.getIssue(issueId);
  }

  async approveProcurementIssueRequest(user: User, id: number) {
    assertWriteAccess(user);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const approver = await queryRunner.manager.findOne(User, {
        where: { id: user.id },
        relations: ['rank'],
      });

      if (!approver || approver.rank?.id !== 1) {
        throw new ForbiddenException('forbidden_access_denied');
      }

      const request = await queryRunner.manager.findOne(
        ProcurementIssueRequest,
        {
          where: { id },
          relations: [
            'requestedBy',
            'procurement',
            'procurement.project',
            'procurement.issue',
          ],
        },
      );

      if (!request) throw new NotFoundException('not_found_procurement_request');

      if (!request.requiresApproval) {
        await queryRunner.commitTransaction();
        return true;
      }

      request.isApproved = true;
      request.approvedBy = approver;
      request.approvedAt = dayjs().toDate();

      await queryRunner.manager.save(request);
      request.procurement.issue.updatedBy = approver;
      await queryRunner.manager.save(request.procurement.issue);
      await queryRunner.commitTransaction();

      try {
        await this.mailService.sendProcurementApprovedMail({
          projectCode: request.procurement.project.code,
          projectName: request.procurement.project.name,
          projectId: request.procurement.project.id,
          issueId: request.procurement.issue.id,
          serialNumber: request.serialNumber,
          requesterName: request.requestedBy.username,
          requesterEmail: request.requestedBy.email,
          approverName: approver.username,
          approvedAt: request.approvedAt,
        });
      } catch (e) {
        console.warn('발주서 승인 완료 메일 전송 실패', e);
      }

      return true;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async deleteProcurementIssueRequest(user: User, id: number) {
    assertWriteAccess(user);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const request = await queryRunner.manager.findOne(
        ProcurementIssueRequest,
        {
          where: { id },
          relations: [
            'requestedBy',
            'procurement',
            'procurement.issue',
            'procurement.issue.createdBy',
          ],
        },
      );

      if (!request) throw new NotFoundException('not_found_procurement_request');

      assertOwnerOrAdmin(user, request.requestedBy.id);

      await queryRunner.manager.softDelete(ProcurementIssueRequestItem, {
        request: { id: request.id },
      });
      await queryRunner.manager.softDelete(ProcurementIssueRequest, request.id);

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }

    return true;
  }

  async createProcurementIssue(user: User, body: CreateProcurementIssueDto) {
    assertWriteAccess(user);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const project = await this.findAndLockProject(
        queryRunner.manager,
        body.projectId,
      );

      // 2️⃣ 카테고리 조회
      const category = await this.findIssueCategory(
        queryRunner.manager,
        body.categoryId,
        4,
      );

      const issue = await queryRunner.manager.create(Issue, {
        project,
        category,
        createdBy: user,
        updatedBy: user,
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

      await this.advanceLatestCategory(queryRunner.manager, project, category);

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
    assertWriteAccess(user);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const project = await this.findAndLockProject(
        queryRunner.manager,
        body.projectId,
      );

      const category = await this.findIssueCategory(
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
        throw new ConflictException('conflict_transaction_issue_already_exists');
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
              existing.paidAt = dto.paidAt ? dayjs(dto.paidAt).toDate() : null;
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

      await this.advanceLatestCategory(queryRunner.manager, project, category);

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
    assertWriteAccess(user);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const project = await this.findAndLockProject(
        queryRunner.manager,
        body.projectId,
      );

      // 2️⃣ 카테고리 조회
      const category = await this.findIssueCategory(
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

      await this.advanceLatestCategory(queryRunner.manager, project, category);

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
    assertWriteAccess(user);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

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

      // Content 업데이트
      if (body.content) {
        const oldUrls = extractImages(issue.content);
        const newUrls = extractImages(body.content);
        const removedUrls = oldUrls.filter((url) => !newUrls.includes(url));

        for (const url of removedUrls) {
          try {
            await this.sftpService.deleteFileByUrl(url);
          } catch (e) {
            console.warn(`삭제 실패: ${url}`, e);
          }
        }

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
      issue.updatedBy = user;
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
    assertWriteAccess(user);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

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

      assertOwnerOrAdmin(user, issue.createdBy.id);

      if (body.kickoffDate) {
        issue.kickoff.kickoffDate = body.kickoffDate;
        await queryRunner.manager.save(issue.kickoff);
      }

      if (body.content) {
        const oldUrls = extractImages(issue.content);
        const newUrls = extractImages(body.content);
        const removedUrls = oldUrls.filter((url) => !newUrls.includes(url));

        for (const url of removedUrls) {
          try {
            await this.sftpService.deleteFileByUrl(url);
          } catch (e) {
            console.warn(`삭제 실패: ${url}`, e);
          }
        }

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

      issue.updatedBy = user;
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
    assertWriteAccess(user);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

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

      if (body.content) {
        const oldUrls = extractImages(issue.content);
        const newUrls = extractImages(body.content);
        const removedUrls = oldUrls.filter((url) => !newUrls.includes(url));

        for (const url of removedUrls) {
          try {
            await this.sftpService.deleteFileByUrl(url);
          } catch (e) {
            console.warn(`삭제 실패: ${url}`, e);
          }
        }

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

      issue.updatedBy = user;
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
    assertWriteAccess(user);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const issue = await queryRunner.manager.findOne(Issue, {
        where: { id },
        relations: [
          'project',
          'createdBy',
          'category',
          'procurement',
          'procurement.items',
          'procurement.items.supplier',
          'procurement.requests',
          'procurement.requests.requestedBy',
          'procurement.requests.items',
          'procurement.requests.supplier',
          'attachments',
        ],
      });
      if (!issue) throw new NotFoundException('not_found_issue');

      assertOwnerOrAdmin(user, issue.createdBy.id);

      if (body.content) {
        const oldUrls = extractImages(issue.content);
        const newUrls = extractImages(body.content);
        const removedUrls = oldUrls.filter((url) => !newUrls.includes(url));

        for (const url of removedUrls) {
          try {
            await this.sftpService.deleteFileByUrl(url);
          } catch (e) {
            console.warn(`삭제 실패: ${url}`, e);
          }
        }

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
                existing.note = dto.note;

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
              note: dto.note,
            });
          }),
        );

        const savedItems = await queryRunner.manager.save(items);
        issue.procurement.items = savedItems;
      }

      issue.updatedBy = user;
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
    assertWriteAccess(user);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

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

      if (body.content) {
        const oldUrls = extractImages(issue.content);
        const newUrls = extractImages(body.content);
        const removedUrls = oldUrls.filter((url) => !newUrls.includes(url));

        for (const url of removedUrls) {
          try {
            await this.sftpService.deleteFileByUrl(url);
          } catch (e) {
            console.warn(`삭제 실패: ${url}`, e);
          }
        }

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
      issue.updatedBy = user;
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
    assertWriteAccess(user);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

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

      if (body.content) {
        const oldUrls = extractImages(issue.content);
        const newUrls = extractImages(body.content);
        const removedUrls = oldUrls.filter((url) => !newUrls.includes(url));

        for (const url of removedUrls) {
          try {
            await this.sftpService.deleteFileByUrl(url);
          } catch (e) {
            console.warn(`삭제 실패: ${url}`, e);
          }
        }

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

      issue.updatedBy = user;
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

  async deleteIssue(user: User, id: number) {
    assertWriteAccess(user);
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
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
        .leftJoinAndSelect('contract.currency', 'currency')
        .leftJoinAndSelect('issue.transaction', 'transaction')
        .leftJoinAndSelect('issue.kickoff', 'kickoff')
        .leftJoinAndSelect('issue.payment', 'payment')
        .leftJoinAndSelect('issue.procurement', 'procurement')
        .leftJoinAndSelect('procurement.items', 'procurementItems')
        .leftJoinAndSelect('procurementItems.supplier', 'supplier')
        .where('issue.id = :id', { id })
        .addOrderBy('attachment.createdAt', 'DESC')
        .getOne();

      const issueDto = await this.mapIssueToDto(issue);

      if (!issue) {
        throw new NotFoundException('not_found_issue');
      }

      assertOwnerOrAdmin(user, issue.createdBy.id);

      const projectId = issue.project.id;

      const project = await this.findAndLockProject(
        queryRunner.manager,
        projectId,
      );

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
        .orderBy('category.id', 'DESC')
        .addOrderBy('issue.createdAt', 'DESC')
        .addOrderBy('issue.id', 'DESC')
        .getOne();

      const latestCategory = latestIssue ? latestIssue.category : null;

      project.latestCategory = latestCategory ?? null;
      await queryRunner.manager.save(project);

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

import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigType } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Issue } from '@/entity/issue/issue.entity';
import { ProcurementIssueRequest } from '@/entity/issue/procurement/procurement-issue-request.entity';
import { User } from '@/entity/user/user.entity';
import { convertToKoreanCurrency } from '@/common/utils/converter.util';
import config from '@/config/config';
import axios from 'axios';
import dayjs from 'dayjs';
import * as ExcelJS from 'exceljs';
import FormData from 'form-data';
import path from 'path';

@Injectable()
export class ProcurementIssueExportService {
  constructor(
    @InjectRepository(Issue)
    private readonly issueRepository: Repository<Issue>,
    @InjectRepository(ProcurementIssueRequest)
    private readonly procurementIssueRequestRepository: Repository<ProcurementIssueRequest>,
    @Inject(config.KEY)
    private readonly configService: ConfigType<typeof config>,
  ) {}

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
}

import { extractImages } from '@/common/utils/markdown.util';
import { CurrencyService } from '@/currency/currency.service';
import { Project } from '@/entity/project/project.entity';
import { ReportAttachment } from '@/entity/report/report-attachment.entity';
import { Report } from '@/entity/report/report.entity';
import { TripActualExpense } from '@/entity/report/trip/trip-actual-expense.entity';
import { TripCategory } from '@/entity/report/trip/trip-category.entity';
import { TripExchangeRate } from '@/entity/report/trip/trip-exchange-rate.entity';
import { TripFuelExpense } from '@/entity/report/trip/trip-fuel-expense.entity';
import { TripRegulationRate } from '@/entity/report/trip/trip-regulation-rate.entity';
import { TripRegulation } from '@/entity/report/trip/trip-regulation.entity';
import { TripReport } from '@/entity/report/trip/trip-report.entity';
import { TripStep } from '@/entity/report/trip/trip-step.entity';
import { Schedule } from '@/entity/schedule/schedule.entity';
import { User } from '@/entity/user/user.entity';
import { assertWriteAccess } from '@/common/policies/write-access.policy';
import { assertOwnerOrAdmin } from '@/common/policies/resource-access.policy';
import { MailService } from '@/mail/mail.service';
import { ProjectService } from '@/project/project.service';
import { ScheduleService } from '@/schedule/schedule.service';
import { SftpService } from '@/sftp/sftp.service';
import { UserService } from '@/user/user.service';
import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import FormData from 'form-data';
import axios from 'axios';
import { plainToInstance } from 'class-transformer';
import path from 'path';
import dayjs from 'dayjs';
import * as ExcelJS from 'exceljs';
import { DataSource, Repository } from 'typeorm';
import {
  CreateReportDto,
  CreateActualExpenseDto,
  CreateRegulationRateDto,
} from './dto/create-report';
import { GetReportDto } from './dto/get-report';
import { ReportDto, ReportListDto } from './dto/report';
import { TripCalculationsDto } from './dto/trip/trip-calculations';
import { TripCategoryDto } from './dto/trip/trip-category';
import { TripRegulationDto } from './dto/trip/trip-regulation';
import { TripStepDto } from './dto/trip/trip-step';
import {
  UpdateReportDto,
  UpdateActualExpenseDto,
  UpdateRegulationRateDto,
} from './dto/update-report';
import config from '@/config/config';
import { ConfigType } from '@nestjs/config';

@Injectable()
export class ReportService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    @InjectRepository(TripReport)
    private readonly tripRepository: Repository<TripReport>,
    @InjectRepository(TripCategory)
    private readonly tripCategoryRepository: Repository<TripCategory>,
    @InjectRepository(TripStep)
    private readonly tripStepRepository: Repository<TripStep>,
    @InjectRepository(TripRegulation)
    private readonly reportRegulationRepository: Repository<TripRegulation>,
    private readonly projectService: ProjectService,
    private readonly scheduleService: ScheduleService,
    private readonly userService: UserService,
    private readonly currencyService: CurrencyService,
    private readonly sftpService: SftpService,
    private readonly mailService: MailService,
    @Inject(config.KEY)
    private configService: ConfigType<typeof config>,
  ) {}

  async findAllTripCategories() {
    return await this.tripCategoryRepository
      .createQueryBuilder('category')
      .select([
        'category.id AS "id"',
        'category.name AS "name"',
        'category.description AS "description"',
      ])
      .orderBy('category.id', 'ASC')
      .getRawMany();
  }

  async findAllTripSteps(id: number) {
    return await this.tripStepRepository
      .createQueryBuilder('step')
      .leftJoin('step.category', 'category')
      .leftJoin('step.scheduleCategory', 'scheduleCategory')
      .where('scheduleCategory.id = :id', { id })
      .select([
        'step.id AS "id"',
        'step.name AS "name"',
        'step.description AS "description"',
        'category.id AS "categoryId"',
      ])
      .orderBy('step.id', 'ASC')
      .getRawMany();
  }

  async findAllTripRegulations(id: number) {
    return await this.reportRegulationRepository
      .createQueryBuilder('regulation')
      .leftJoin('regulation.step', 'step')
      .leftJoin('step.category', 'category')
      .leftJoin('step.scheduleCategory', 'scheduleCategory')
      .where('scheduleCategory.id = :id', { id })
      .select([
        'regulation.id AS "id"',
        'step.id AS "stepId"',
        'regulation.rate as "rate"',
      ])
      .orderBy('regulation.id', 'ASC')
      .getRawMany();
  }

  async findReportById(id: number) {
    return await this.reportRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.project', 'project')
      .leftJoinAndSelect('report.schedule', 'schedule')
      .leftJoinAndSelect('schedule.project', 'scheduleProject')
      .leftJoinAndSelect('report.createdBy', 'createdBy')
      .leftJoinAndSelect('createdBy.department', 'department')
      .leftJoinAndSelect('report.updatedBy', 'updatedBy')
      .leftJoinAndSelect('report.trip', 'trip')
      .leftJoinAndSelect('trip.expenses', 'expense')
      .leftJoinAndSelect('expense.step', 'expenseStep')
      .leftJoinAndSelect('trip.rates', 'rate')
      .leftJoinAndSelect('rate.step', 'rateStep')
      .leftJoinAndSelect('trip.fuel', 'fuel')
      .leftJoinAndSelect('trip.exchangeRate', 'exchangeRate')
      .leftJoinAndSelect('report.attachments', 'attachment')
      .where('report.id = :id', { id })
      .addOrderBy('attachment.createdAt', 'DESC')
      .getOne();
  }

  async findReports(value: GetReportDto) {
    return await this.reportRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.project', 'project')
      .leftJoinAndSelect('report.schedule', 'schedule')
      .leftJoinAndSelect('schedule.project', 'scheduleProject')
      .leftJoinAndSelect('report.createdBy', 'createdBy')
      .leftJoinAndSelect('report.updatedBy', 'updatedBy')
      .leftJoinAndSelect('report.trip', 'trip')
      .leftJoinAndSelect('trip.expenses', 'expense')
      .leftJoinAndSelect('expense.step', 'expenseStep')
      .leftJoinAndSelect('trip.rates', 'rate')
      .leftJoinAndSelect('rate.step', 'rateStep')
      .leftJoinAndSelect('trip.fuel', 'fuel')
      .leftJoinAndSelect('trip.exchangeRate', 'exchangeRate')
      .leftJoinAndSelect('report.attachments', 'attachment')
      .where('project.id = :id', { id: value.projectId })
      .orderBy('report.createdAt', 'DESC')
      .addOrderBy('attachment.createdAt', 'DESC')
      .skip((value.page - 1) * value.limit)
      .take(value.limit)
      .getManyAndCount();
  }

  async getAllTripCategories() {
    const categories = await this.findAllTripCategories();

    const result = plainToInstance(TripCategoryDto, categories, {
      excludeExtraneousValues: true,
    });

    return result;
  }

  async getAllTripSteps(id: number) {
    const steps = await this.findAllTripSteps(id);

    const result = plainToInstance(TripStepDto, steps, {
      excludeExtraneousValues: true,
    });

    return result;
  }

  async getAllTripRegulations(id: number) {
    const regulations = await this.findAllTripRegulations(id);

    const result = plainToInstance(TripRegulationDto, regulations, {
      excludeExtraneousValues: true,
      enableImplicitConversion: true,
    });

    return result;
  }

  // 🌟 exportReport 함수 수정됨: 요청별 고유 폴더 사용 및 필요한 시트만 남기고 변환
  async exportTrip(id: number) {
    const TEMPLATE_BASE_PATH = path.join(process.cwd(), 'templates');
    const TEMPLATE_FILE_NAME = 'trip_template.xlsx';

    const PATH_FILENAME = `report_${id}_filled`;
    const TEMPLATE_PATH = path.join(TEMPLATE_BASE_PATH, TEMPLATE_FILE_NAME);

    const report = await this.findReportById(id);
    if (!report) throw new NotFoundException('report_not_found');

    const schedule = await this.scheduleService.getSchedule(report.schedule.id);
    const isDomestic = schedule.category.id === 1;

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(TEMPLATE_PATH);

      const worksheet = workbook.worksheets[isDomestic ? 0 : 1];

      const sheetToRemove = workbook.worksheets.find(
        (s) => s.id !== worksheet.id,
      );

      if (sheetToRemove) {
        workbook.removeWorksheet(sheetToRemove.id);
      }

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
          left: 0.5 / 2.54,
          right: 0.5 / 2.54,
          top: 0.5 / 2.54,
          bottom: 0.5 / 2.54,
          header: 0,
          footer: 0,
        },
      };

      // 3) 인쇄 영역 지정 (여백 반영 안정화)
      worksheet.pageSetup.printArea = 'A1:L53';

      const startDate = dayjs(report.schedule.start);
      const endDate = dayjs(report.schedule.end);

      // 1. 일수 (Days) 계산
      // 'day' 단위를 사용하여 두 날짜 사이의 차이를 구합니다.
      // 자정 기준으로 계산되므로, 2025-12-04 - 2025-12-02 = 2일이 나옵니다.
      const durationDays = endDate.diff(startDate, 'day') + 1;

      // 2. 박수 (Nights) 계산
      // 박수는 일수보다 1 작습니다. (단, 0일 미만은 없으므로 Math.max(0, ...) 사용)
      const durationNights = Math.max(0, durationDays - 1);

      // 3. 최종 출력 포맷
      let duration =
        durationDays <= 1
          ? '당일 출장'
          : `${durationNights}박 ${durationDays}일`;

      // 데이터 채우기 (개요 시트)
      worksheet.getCell('C3').value = report.createdBy.department.name;
      worksheet.getCell('C4').value = schedule.summary;
      worksheet.getCell('G3').value = report.createdBy.username;
      worksheet.getCell('C5').value = dayjs(schedule.start).format(
        'YYYY.MM.DD',
      );
      worksheet.getCell('C6').value = dayjs(schedule.end).format('YYYY.MM.DD');
      worksheet.getCell('C7').value = duration;
      worksheet.getCell('J4').value = schedule.projectClientName;
      worksheet.getCell('J5').value = schedule.projectCode;
      worksheet.getCell('A12').value = schedule.description ?? '';

      if (isDomestic) {
        const airfareExpenses = report.trip.expenses.filter(
          (expense) => expense.step.id === 1,
        );
        const totalAirfare = airfareExpenses.reduce((sum, expense) => {
          return sum + expense.price;
        }, 0);
        const airfareDetails = airfareExpenses
          .map((expense) => expense.details)
          .filter((details) => details)
          .join(', ');

        worksheet.getCell('H18').value = totalAirfare;
        worksheet.getCell('I18').value = airfareDetails;

        const trainFareExpenses = report.trip.expenses.filter(
          (expense) => expense.step.id == 2,
        );
        const totalTrainFare = trainFareExpenses.reduce((sum, expense) => {
          return sum + expense.price;
        }, 0);
        const trainFareDetails = trainFareExpenses
          .map((expense) => expense.details)

          .filter((details) => details)
          .join(', ');

        worksheet.getCell('H19').value = totalTrainFare;
        worksheet.getCell('I19').value = trainFareDetails;

        const otherTransitExpenses = report.trip.expenses.filter(
          (expense) => expense.step.id == 3,
        );
        const totalOtherTransit = otherTransitExpenses.reduce(
          (sum, expense) => {
            return sum + expense.price;
          },
          0,
        );
        const otherTransitDetails = otherTransitExpenses
          .map((expense) => expense.details)

          .filter((details) => details)
          .join(', ');

        worksheet.getCell('H20').value = totalOtherTransit;
        worksheet.getCell('I20').value = otherTransitDetails;

        const transportationCost =
          totalAirfare + totalTrainFare + totalOtherTransit;

        worksheet.getCell('H21').value = transportationCost;

        const parkingFeeExpenses = report.trip.expenses.filter(
          (expense) => expense.step.id == 4,
        );
        const totalParkingFee = parkingFeeExpenses.reduce((sum, expense) => {
          return sum + expense.price;
        }, 0);
        const parkingFeeDetails = parkingFeeExpenses
          .map((expense) => expense.details)

          .filter((details) => details)
          .join(', ');

        worksheet.getCell('H22').value = totalParkingFee;
        worksheet.getCell('I22').value = parkingFeeDetails;

        const taxiFareExpenses = report.trip.expenses.filter(
          (expense) => expense.step.id == 5,
        );
        const totalTaxiFare = taxiFareExpenses.reduce((sum, expense) => {
          return sum + expense.price;
        }, 0);
        const taxiFareDetails = taxiFareExpenses
          .map((expense) => expense.details)

          .filter((details) => details)
          .join(', ');

        worksheet.getCell('H23').value = totalTaxiFare;
        worksheet.getCell('I23').value = taxiFareDetails;

        const busFareExpenses = report.trip.expenses.filter(
          (expense) => expense.step.id == 6,
        );
        const totalBusFare = busFareExpenses.reduce((sum, expense) => {
          return sum + expense.price;
        }, 0);
        const busFareDetails = busFareExpenses
          .map((expense) => expense.details)
          .filter((details) => details)
          .join(', ');

        worksheet.getCell('H24').value = totalBusFare;
        worksheet.getCell('I24').value = busFareDetails;

        const localTransportationCost =
          totalParkingFee + totalTaxiFare + totalBusFare;

        worksheet.getCell('H25').value = localTransportationCost;

        const ulsanAccommodationExpenses = report.trip.expenses.filter(
          (expense) => expense.step.id == 7,
        );
        const ulsanAccommodationRate = report.trip.rates.find(
          (rate) => rate.step.id == 7,
        ) ?? { rate: 0, days: 0 };
        const totalUlsanAccommodationRate =
          ulsanAccommodationRate.rate * ulsanAccommodationRate.days;
        const totalUlsanAccomadationExpenses =
          ulsanAccommodationExpenses.reduce((sum, expense) => {
            return sum + expense.price;
          }, 0);
        const ulsanAccommodationDetails = ulsanAccommodationExpenses
          .map((expense) => expense.details)
          .filter((details) => details)
          .join(', ');

        worksheet.getCell('E26').value = ulsanAccommodationRate.rate;
        worksheet.getCell('F26').value = ulsanAccommodationRate.days;
        worksheet.getCell('G26').value = totalUlsanAccommodationRate;
        worksheet.getCell('H26').value = totalUlsanAccomadationExpenses;
        worksheet.getCell('I26').value = ulsanAccommodationDetails;

        const notUlsanAccommodationExpenses = report.trip.expenses.filter(
          (expense) => expense.step.id == 8,
        );
        const notUlsanAccommodationRate = report.trip.rates.find(
          (rate) => rate.step.id == 8,
        ) ?? { rate: 0, days: 0 };
        const totalNotUlsanAccommodationRate =
          notUlsanAccommodationRate.rate * notUlsanAccommodationRate.days;
        const totalNotUlsanAccommodationExpenses =
          notUlsanAccommodationExpenses.reduce((sum, expense) => {
            return sum + expense.price;
          }, 0);
        const notUlsanAccommodationDetails = notUlsanAccommodationExpenses
          .map((expense) => expense.details)
          .filter((details) => details)
          .join(', ');

        worksheet.getCell('E27').value = notUlsanAccommodationRate.rate;
        worksheet.getCell('F27').value = notUlsanAccommodationRate.days;
        worksheet.getCell('G27').value = totalNotUlsanAccommodationRate;
        worksheet.getCell('H27').value = totalNotUlsanAccommodationExpenses;
        worksheet.getCell('I27').value = notUlsanAccommodationDetails;

        const weekdayAccommodationExpenses = report.trip.expenses.filter(
          (expense) => expense.step.id == 9,
        );
        const weekdayAccommodationRate = report.trip.rates.find(
          (rate) => rate.step.id == 9,
        ) ?? { rate: 0, days: 0 };
        const totalWeekdayAccommodationRate =
          weekdayAccommodationRate.rate * weekdayAccommodationRate.days;
        const totalWeekdayAccomdationExpenses =
          weekdayAccommodationExpenses.reduce((sum, expense) => {
            return sum + expense.price;
          }, 0);
        const weekdayAccomdationDetails = weekdayAccommodationExpenses
          .map((expense) => expense.details)
          .filter((details) => details)
          .join(', ');

        worksheet.getCell('E28').value = weekdayAccommodationRate.rate;
        worksheet.getCell('F28').value = weekdayAccommodationRate.days;
        worksheet.getCell('G28').value = totalWeekdayAccommodationRate;
        worksheet.getCell('H28').value = totalWeekdayAccomdationExpenses;
        worksheet.getCell('I28').value = weekdayAccomdationDetails;

        const accommodationRate =
          totalUlsanAccommodationRate +
          totalNotUlsanAccommodationRate +
          totalWeekdayAccommodationRate;

        worksheet.getCell('G29').value = accommodationRate;

        const accommodationCost =
          totalUlsanAccomadationExpenses +
          totalNotUlsanAccommodationExpenses +
          totalWeekdayAccomdationExpenses;

        worksheet.getCell('H29').value = accommodationCost;

        const accommodationSettlement = accommodationRate - accommodationCost;

        worksheet.getCell('H30').value = accommodationSettlement;

        const weekdayDailyRate = report.trip.rates.find(
          (rate) => rate.step.id == 10,
        ) ?? { rate: 0, days: 0 };
        const totalWeekdayDailyRate =
          weekdayDailyRate.rate * weekdayDailyRate.days;

        worksheet.getCell('E33').value = weekdayDailyRate.rate;
        worksheet.getCell('F33').value = weekdayDailyRate.days;
        worksheet.getCell('H33').value = totalWeekdayDailyRate;

        const weekendDailyRate = report.trip.rates.find(
          (rate) => rate.step.id == 11,
        ) ?? { rate: 0, days: 0 };
        const totalWeekendDailyRate =
          weekendDailyRate.rate * weekendDailyRate.days;

        worksheet.getCell('E34').value = weekendDailyRate.rate;
        worksheet.getCell('F34').value = weekendDailyRate.days;
        worksheet.getCell('H34').value = totalWeekendDailyRate;

        const dailyRate = totalWeekdayDailyRate + totalWeekendDailyRate;

        worksheet.getCell('H35').value = dailyRate;

        const otherSettlementExpenses = report.trip.expenses.filter(
          (expense) => expense.step.id == 12,
        );
        const totalOtherSettlement = otherSettlementExpenses.reduce(
          (sum, expense) => {
            return sum + expense.price;
          },
          0,
        );
        const otherSettlementDetails = otherSettlementExpenses
          .map((expense) => expense.details)
          .filter((details) => details)
          .join(', ');

        worksheet.getCell('H38').value = totalOtherSettlement;
        worksheet.getCell('I38').value = otherSettlementDetails;

        const corporateFuelExpenses = report.trip.expenses.filter(
          (expense) => expense.step.id == 13,
        );
        const totalCorporateFuel = corporateFuelExpenses.reduce(
          (sum, expense) => {
            return sum + expense.price;
          },
          0,
        );
        const corporateFuelDetails = corporateFuelExpenses
          .map((expense) => expense.details)
          .filter((details) => details)
          .join(', ');

        worksheet.getCell('H39').value = totalCorporateFuel;
        worksheet.getCell('I39').value = corporateFuelDetails;

        const personalFuelExpenses = report.trip.fuel;
        const personalFuelRate = personalFuelExpenses?.rate ?? 0;
        const personalFuelMileage = personalFuelExpenses?.mileage ?? 0;
        const personalFuelDistance = personalFuelExpenses?.distance ?? 0;
        const totalPersonalFuel =
          personalFuelMileage != 0
            ? personalFuelRate * (personalFuelDistance / personalFuelMileage)
            : 0;

        worksheet.getCell('E41').value = personalFuelRate;
        worksheet.getCell('F41').value = personalFuelMileage;
        worksheet.getCell('G41').value = personalFuelDistance;
        worksheet.getCell('H41').value = totalPersonalFuel;

        const otherCost =
          totalOtherSettlement + totalCorporateFuel + totalPersonalFuel;

        worksheet.getCell('H45').value = otherCost;

        worksheet.getCell('H46').value =
          transportationCost +
          localTransportationCost +
          accommodationRate +
          dailyRate +
          otherCost;
        worksheet.getCell('H47').value = accommodationSettlement;
        worksheet.getCell('H48').value = dailyRate + totalPersonalFuel;
      } else {
        const exchangeRate = await report.trip?.exchangeRate.rate;

        const airfareExpenses = report.trip.expenses.filter(
          (expense) => expense.step.id === 14,
        );
        const totalAirfare = airfareExpenses.reduce((sum, expense) => {
          return sum + expense.price;
        }, 0);
        const airfareDetails = airfareExpenses
          .map((expense) => expense.details)
          .filter((details) => details)
          .join(', ');

        worksheet.getCell('H18').value = totalAirfare;
        worksheet.getCell('I18').value = airfareDetails;

        const taxiFareExpense = report.trip.expenses.filter(
          (expense) => expense.step.id === 15,
        );
        const totalTaxiFare = taxiFareExpense.reduce((sum, expense) => {
          return sum + expense.price;
        }, 0);
        const taxiFareDetails = taxiFareExpense
          .map((expense) => expense.details)
          .filter((details) => details)
          .join(', ');

        worksheet.getCell('H19').value = totalTaxiFare;
        worksheet.getCell('I19').value = taxiFareDetails;

        const pickupFeeExpense = report.trip.expenses.filter(
          (expense) => expense.step.id === 16,
        );
        const totalPickupFee = pickupFeeExpense.reduce((sum, expense) => {
          return sum + expense.price;
        }, 0);
        const pickupFeeDetails = pickupFeeExpense
          .map((expense) => expense.details)
          .filter((details) => details)
          .join(', ');

        worksheet.getCell('H20').value = totalPickupFee;
        worksheet.getCell('I20').value = pickupFeeDetails;

        const transportationCost =
          totalAirfare + totalTaxiFare + totalPickupFee;

        worksheet.getCell('H21').value = transportationCost;

        const parkingFeeExpenses = report.trip.expenses.filter(
          (expense) => expense.step.id === 17,
        );
        const totalParkingFee = parkingFeeExpenses.reduce((sum, expense) => {
          return sum + expense.price;
        }, 0);
        const parkingFeeDetails = parkingFeeExpenses
          .map((expense) => expense.details)
          .filter((details) => details)
          .join(', ');

        worksheet.getCell('H24').value = totalParkingFee;
        worksheet.getCell('I24').value = parkingFeeDetails;

        const localTaxiFareExpenses = report.trip.expenses.filter(
          (expense) => expense.step.id === 18,
        );
        const totalLocalTaxiFare = localTaxiFareExpenses.reduce(
          (sum, expense) => {
            return sum + expense.price;
          },
          0,
        );
        const localTaxiFareDetails = localTaxiFareExpenses
          .map((expense) => expense.details)
          .filter((details) => details)
          .join(', ');

        worksheet.getCell('H25').value = totalLocalTaxiFare;
        worksheet.getCell('I25').value = localTaxiFareDetails;

        const rentalFeeExpenses = report.trip.expenses.filter(
          (expense) => expense.step.id == 19,
        );
        const totalRentalFee = rentalFeeExpenses.reduce((sum, expense) => {
          return sum + expense.price;
        }, 0);
        const rentalFeeDetails = rentalFeeExpenses
          .map((expense) => expense.details)
          .filter((details) => details)
          .join(', ');

        worksheet.getCell('H26').value = totalRentalFee;
        worksheet.getCell('I26').value = rentalFeeDetails;

        const localTransportationCost =
          totalParkingFee + totalLocalTaxiFare + totalRentalFee;

        worksheet.getCell('H27').value = localTransportationCost;

        const accommodationExpenses = report.trip.expenses.filter(
          (expense) => expense.step.id == 20,
        );
        const totalAccommodation = accommodationExpenses.reduce(
          (sum, expense) => {
            return sum + expense.price;
          },
          0,
        );
        const accommodationDetails = accommodationExpenses
          .map((expense) => expense.details)
          .filter((details) => details)
          .join(', ');

        worksheet.getCell('H28').value = totalAccommodation;
        worksheet.getCell('I28').value = accommodationDetails;
        worksheet.getCell('H30').value = totalAccommodation;

        const managerDailyRate = report.trip.rates.find(
          (rate) => rate.step.id === 21,
        ) ?? { rate: 0, days: 0 };
        const totalManagerDailyRate =
          managerDailyRate.rate * managerDailyRate.days;

        worksheet.getCell('E32').value = managerDailyRate.rate;
        worksheet.getCell('F32').value = managerDailyRate.days;
        worksheet.getCell('H32').value = totalManagerDailyRate;

        const seniorDailyRate = report.trip.rates.find(
          (rate) => rate.step.id === 22,
        ) ?? { rate: 0, days: 0 };
        const totalSeniorDailyRate =
          seniorDailyRate.rate * seniorDailyRate.days;

        worksheet.getCell('E33').value = seniorDailyRate.rate;
        worksheet.getCell('F33').value = seniorDailyRate.days;
        worksheet.getCell('H33').value = totalSeniorDailyRate;

        const otherDailyRate = report.trip.rates.find(
          (rate) => rate.step.id === 23,
        ) ?? { rate: 0, days: 0 };
        const totalOtherDailyRate = otherDailyRate.rate * otherDailyRate.days;

        worksheet.getCell('E34').value = otherDailyRate.rate;
        worksheet.getCell('F34').value = otherDailyRate.days;
        worksheet.getCell('H34').value = totalOtherDailyRate;

        const dailyRate =
          totalManagerDailyRate + totalSeniorDailyRate + totalOtherDailyRate;

        worksheet.getCell('H35').value = dailyRate;

        worksheet.getCell('E35').value = exchangeRate;

        const deducted = report.trip.isDeducted ? 0.1 : 0.0;

        worksheet.getCell('H36').value = deducted;

        const holidayRate = report.trip.rates.find(
          (rate) => rate.step.id === 24,
        ) ?? {
          rate: 0,
          days: 0,
        };
        const totalHolidayRate = holidayRate.rate * holidayRate.days;

        worksheet.getCell('E37').value = holidayRate.rate;
        worksheet.getCell('F37').value = holidayRate.days;
        worksheet.getCell('H37').value = totalHolidayRate;

        const amountReceived = dailyRate * (1 - deducted) + totalHolidayRate;

        worksheet.getCell('H38').value = amountReceived;

        const totalDailyRate = amountReceived * exchangeRate;

        worksheet.getCell('H41').value = totalDailyRate;

        const insuranceExpenses = report.trip.expenses.filter(
          (expense) => expense.step.id === 25,
        );
        const totalInsurance = insuranceExpenses.reduce((sum, expense) => {
          return sum + expense.price;
        }, 0);
        const insuranceDetails = insuranceExpenses
          .map((expense) => expense.details)
          .filter((details) => details)
          .join(', ');

        worksheet.getCell('H42').value = totalInsurance;
        worksheet.getCell('I42').value = insuranceDetails;

        const usimExpenses = report.trip.expenses.filter(
          (expense) => expense.step.id === 26,
        );
        const totalUsim = usimExpenses.reduce((sum, expense) => {
          return sum + expense.price;
        }, 0);
        const usimDetails = usimExpenses
          .map((expense) => expense.details)
          .filter((details) => details)
          .join(', ');

        worksheet.getCell('H43').value = totalUsim;
        worksheet.getCell('I43').value = usimDetails;

        const loamingExpenses = report.trip.expenses.filter(
          (expense) => expense.step.id === 27,
        );
        const totalLoaming = loamingExpenses.reduce((sum, expense) => {
          return sum + expense.price;
        }, 0);
        const loamingDetails = loamingExpenses
          .map((expense) => expense.details)
          .filter((details) => details)
          .join(', ');

        worksheet.getCell('H44').value = totalLoaming;
        worksheet.getCell('I44').value = loamingDetails;

        const testExpenses = report.trip.expenses.filter(
          (expense) => expense.step.id === 28,
        );
        const totalTest = testExpenses.reduce((sum, expense) => {
          return sum + expense.price;
        }, 0);
        const testDetails = testExpenses
          .map((expense) => expense.details)
          .filter((details) => details)
          .join(', ');

        worksheet.getCell('H45').value = totalTest;
        worksheet.getCell('I45').value = testDetails;

        const otherChargeExpenses = report.trip.expenses.filter(
          (expense) => expense.step.id === 29,
        );
        const totalOtherCharge = otherChargeExpenses.reduce((sum, expense) => {
          return sum + expense.price;
        }, 0);
        const otherChargeDetails = otherChargeExpenses
          .map((expense) => expense.details)
          .filter((details) => details)
          .join(', ');

        worksheet.getCell('H46').value = totalOtherCharge;
        worksheet.getCell('I46').value = otherChargeDetails;

        const otherCost =
          totalInsurance +
          totalUsim +
          totalLoaming +
          totalTest +
          totalOtherCharge;

        worksheet.getCell('H47').value = otherCost;

        worksheet.getCell('H48').value =
          transportationCost +
          localTransportationCost +
          totalAccommodation +
          totalDailyRate +
          otherCost;
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

  async getReport(id: number) {
    // 1. 공통 조회 및 예외 처리 (통합된 getReport 활용)
    const report = await this.findReportById(id);

    const schedule = report.schedule
      ? await this.scheduleService.getSchedule(report.schedule.id)
      : null;

    // 2. 계산된 값들 추가
    let calculations = null;
    if (report.trip && schedule) {
      const isDomestic = schedule.category.id === 1;
      calculations = isDomestic
        ? await this.calculateDomesticTripCosts(report)
        : await this.calculateOverseasTripCosts(report);
    }

    // 3. plainToInstance 변환 (user가 주어지면 덮어쓰고, 없으면 기존 report.createdBy 유지)
    const reportDto = plainToInstance(
      ReportDto,
      {
        ...report,
        schedule,
        trip: report.trip
          ? {
              ...report.trip,
              expenses:
                report.trip.expenses?.map((expense) => ({
                  ...expense,
                  price: expense.price !== null ? expense.price : null,
                  stepId: expense.step?.id,
                })) ?? [],
              rates:
                report.trip.rates?.map((rate) => ({
                  ...rate,
                  stepId: rate.step?.id,
                })) ?? [],
              fuel: report.trip.fuel ?? null,
              exchangeRate: report.trip.exchangeRate ?? null,
              calculations,
            }
          : null,
      },
      {
        excludeExtraneousValues: true,
      },
    );

    return reportDto;
  }

  async getReports(query: GetReportDto) {
    const [reports, total] = await this.findReports(query);

    const items = await Promise.all(
      reports.map(async (report) => {
        const schedule = report.schedule
          ? await this.scheduleService.getSchedule(report.schedule.id)
          : null;
        const createdBy = await this.userService.getUser(report.createdBy.id);

        let calculations = null;
        if (report.trip && schedule) {
          const isDomestic = schedule.category.id === 1;
          calculations = isDomestic
            ? await this.calculateDomesticTripCosts(report)
            : await this.calculateOverseasTripCosts(report);
        }

        const reportDto = plainToInstance(
          ReportDto,
          {
            ...report,
            schedule,
            createdBy,
            trip: report.trip
              ? {
                  ...report.trip,
                  expenses:
                    report.trip.expenses?.map((expense) => ({
                      ...expense,
                      price: expense.price !== null ? expense.price : null,
                      stepId: expense.step?.id,
                    })) ?? [],
                  rates:
                    report.trip.rates?.map((rate) => ({
                      ...rate,
                      stepId: rate.step?.id,
                    })) ?? [],
                  fuel: report.trip.fuel ?? null,
                  exchangeRate: report.trip.exchangeRate ?? null,
                  calculations: calculations,
                }
              : null,
          },
          {
            excludeExtraneousValues: true,
          },
        );

        return reportDto;
      }),
    );

    const reportListDto = plainToInstance(ReportListDto, {
      items: items,
      page: query.page,
      total: total,
    });

    return reportListDto;
  }

  async backfillOverseasTripExchangeRates(dryRun = true) {
    const reports = await this.reportRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.schedule', 'schedule')
      .leftJoinAndSelect('schedule.category', 'scheduleCategory')
      .leftJoinAndSelect('report.trip', 'trip')
      .leftJoinAndSelect('trip.exchangeRate', 'exchangeRate')
      .where('trip.id IS NOT NULL')
      .andWhere('exchangeRate.id IS NULL')
      .andWhere('scheduleCategory.id != :domesticCategoryId', {
        domesticCategoryId: 1,
      })
      .orderBy('report.id', 'ASC')
      .getMany();

    const results: Array<{
      reportId: number;
      tripId: number;
      requestedDate: string;
      appliedDate: string;
      rate: number;
    }> = [];

    for (const report of reports) {
      const requestedDate = dayjs(report.schedule.start).format('YYYYMMDD');
      const snapshot =
        await this.currencyService.getExchangeRate(requestedDate);

      if (!dryRun) {
        const exchangeRate = this.dataSource.manager.create(TripExchangeRate, {
          trip: report.trip,
          rate: snapshot.rate,
          appliedDate: snapshot.appliedDate,
        });

        await this.dataSource.manager.save(exchangeRate);
      }

      results.push({
        reportId: report.id,
        tripId: report.trip.id,
        requestedDate,
        appliedDate: dayjs(snapshot.appliedDate).format('YYYYMMDD'),
        rate: snapshot.rate,
      });
    }

    return {
      dryRun,
      total: reports.length,
      items: results,
    };
  }

  async getDomesticTripCalculations(user: User, id: number) {
    const report = await this.findReportById(id);

    if (!report) throw new NotFoundException('report_not_found');
    if (!report.trip) throw new NotFoundException('trip_data_not_found');
    assertOwnerOrAdmin(user, report.createdBy.id);

    const schedule = await this.scheduleService.getSchedule(report.schedule.id);

    if (!schedule) throw new NotFoundException('schedule_not_found');

    if (schedule.category.id !== 1) {
      throw new ForbiddenException('not_domestic_trip');
    }

    return await this.calculateDomesticTripCosts(report);
  }

  async getOverseasTripCalculations(user: User, id: number) {
    const report = await this.findReportById(id);

    if (!report) throw new NotFoundException('report_not_found');
    if (!report.trip) throw new NotFoundException('trip_data_not_found');
    assertOwnerOrAdmin(user, report.createdBy.id);

    const schedule = await this.scheduleService.getSchedule(report.schedule.id);

    if (!schedule) throw new NotFoundException('schedule_not_found');

    if (schedule.category.id === 1) {
      throw new ForbiddenException('not_overseas_trip');
    }

    return await this.calculateOverseasTripCosts(report);
  }

  private async calculateDomesticTripCosts(report: Report) {
    // 헬퍼 함수: stepIds로 지정된 항목들의 합계 계산
    const sumExpensesByStepIds = (stepIds: number[]): number => {
      return report.trip.expenses
        .filter((expense) => stepIds.includes(expense.step.id))
        .reduce((sum, expense) => sum + expense.price, 0);
    };

    // 교통비: step 1, 2, 3
    const transportationCost = sumExpensesByStepIds([1, 2, 3]);

    // 현지교통비: step 4, 5, 6
    const localTransportCost = sumExpensesByStepIds([4, 5, 6]);

    // 숙박비 정산액 계산 (step 7, 8, 9)
    const accommodationRate = [7, 8, 9].reduce((sum, stepId) => {
      const rate = report.trip.rates.find((r) => r.step.id === stepId);
      return sum + (rate?.rate ?? 0) * (rate?.days ?? 0);
    }, 0);
    const accommodationCost = sumExpensesByStepIds([7, 8, 9]);
    const accommodationSettlement = accommodationRate - accommodationCost;

    // 일비 (step 10, 11)
    const dailyRate = [10, 11].reduce((sum, stepId) => {
      const rate = report.trip.rates.find((r) => r.step.id === stepId);
      return sum + (rate?.rate ?? 0) * (rate?.days ?? 0);
    }, 0);

    // 개인차량 유류비
    const personalFuel = report.trip.fuel;
    const totalPersonalFuel =
      personalFuel?.mileage !== 0 && personalFuel?.mileage
        ? personalFuel.rate * (personalFuel.distance / personalFuel.mileage)
        : 0;

    // 기타 비용: step 12, 13
    const otherCost = sumExpensesByStepIds([12, 13]) + totalPersonalFuel;

    // 총 비용
    const totalCost =
      transportationCost +
      localTransportCost +
      accommodationRate +
      dailyRate +
      otherCost;

    return plainToInstance(
      TripCalculationsDto,
      {
        totalCost,
        taxableAmount: accommodationSettlement,
        nonTaxableAmount: dailyRate + totalPersonalFuel,
      },
      { excludeExtraneousValues: true },
    );
  }

  private async calculateOverseasTripCosts(report: Report) {
    const exchangeRate = report.trip?.exchangeRate.rate;

    // 헬퍼 함수: stepIds로 지정된 항목들의 합계 계산
    const sumExpensesByStepIds = (stepIds: number[]): number => {
      return report.trip.expenses
        .filter((expense) => stepIds.includes(expense.step.id))
        .reduce((sum, expense) => sum + expense.price, 0);
    };

    // 교통비: step 14, 15, 16
    const transportationCost = sumExpensesByStepIds([14, 15, 16]);

    // 현지교통비: step 17, 18, 19
    const localTransportCost = sumExpensesByStepIds([17, 18, 19]);

    // 숙박비: step 20
    const accommodation = sumExpensesByStepIds([20]);

    // 일비 계산 (step 21, 22, 23)
    const dailyRate = [21, 22, 23].reduce((sum, stepId) => {
      const rate = report.trip.rates.find((r) => r.step.id === stepId);
      return sum + (rate?.rate ?? 0) * (rate?.days ?? 0);
    }, 0);

    // 환율 적용 일비 (step 21~24 + 휴일 보정)
    const deducted = report.trip.isDeducted ? 0.1 : 0.0;
    const holidayRate = report.trip.rates.find((r) => r.step.id === 24);
    const totalHolidayRate =
      (holidayRate?.rate ?? 0) * (holidayRate?.days ?? 0);
    const amountReceived = dailyRate * (1 - deducted) + totalHolidayRate;
    const totalDailyRate = amountReceived * exchangeRate;

    // 기타 비용: step 25, 26, 27, 28, 29
    const otherCost = sumExpensesByStepIds([25, 26, 27, 28, 29]);

    // 총 비용
    const totalCost =
      transportationCost +
      localTransportCost +
      accommodation +
      totalDailyRate +
      otherCost;

    return plainToInstance(
      TripCalculationsDto,
      {
        totalCost,
        exchangeRate,
      },
      { excludeExtraneousValues: true },
    );
  }

  async sendMail(user: User, id: number, userIds?: number[]) {
    assertWriteAccess(user);
    const report = await this.findReportById(id);
    const schedule = report.schedule
      ? await this.scheduleService.getSchedule(report.schedule.id)
      : null;
    const project = await this.projectService.getProjectWithoutUser(
      report.project.id,
    );

    const reportDto = plainToInstance(
      ReportDto,
      {
        ...report,
        schedule,
        trip: report.trip
          ? {
              ...report.trip,
              expenses:
                report.trip.expenses?.map((expense) => ({
                  ...expense,
                  price: expense.price !== null ? expense.price : null,
                  stepId: expense.step?.id,
                })) ?? [],
              rates:
                report.trip.rates?.map((rate) => ({
                  ...rate,
                  stepId: rate.step?.id,
                })) ?? [],
              fuel: report.trip.fuel ?? null,
              exchangeRate: report.trip.exchangeRate ?? null,
            }
          : null,
      },
      {
        excludeExtraneousValues: true,
      },
    );

    await this.mailService.sendReportMail(project, reportDto, userIds);
  }

  async createReport(user: User, body: CreateReportDto) {
    assertWriteAccess(user);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const scheduleReference = body.scheduleId
        ? ({ id: body.scheduleId } as Schedule)
        : null;

      const projectReference = body.projectId
        ? ({ id: body.projectId } as Project)
        : null;

      if (scheduleReference) {
        const existingReport = await queryRunner.manager.findOne(Report, {
          where: {
            schedule: { id: body.scheduleId },
            deletedAt: null,
          },
        });

        if (existingReport) {
          throw new ConflictException('report_exists');
        }
      }

      const report = queryRunner.manager.create(Report, {
        schedule: scheduleReference,
        project: projectReference,
        createdBy: user,
        updatedBy: user,
        content: body.content,
      });

      const saved = await queryRunner.manager.save(report);

      if (body.trip) {
        const schedule = body.scheduleId
          ? await this.scheduleService.getSchedule(body.scheduleId)
          : null;
        const isOverseasTrip = Boolean(schedule) && schedule.category.id !== 1;

        const trip = queryRunner.manager.create(TripReport, {
          report: saved,
          isDeducted: body.trip.isDeducted ?? false,
        });
        const savedTrip = await queryRunner.manager.save(trip);

        // 2-1. Expense 생성 (TripReport에 연결)
        let savedExpenses: TripActualExpense[] = [];
        if (body.trip.expenses) {
          const expenseEntities = body.trip.expenses.map(
            (expenseDto: CreateActualExpenseDto) => {
              const expense = new TripActualExpense();
              expense.trip = savedTrip; // ⭐️ report 대신 trip에 연결
              expense.step = { id: expenseDto.stepId } as TripStep;
              expense.price = expenseDto.price;
              expense.details = expenseDto.details;
              return expense;
            },
          );
          savedExpenses = await queryRunner.manager.save(expenseEntities);
        }

        // 2-2. Rate 생성 (TripReport에 연결)
        let savedRates: TripRegulationRate[] = [];
        if (body.trip.rates) {
          const rateEntities = body.trip.rates.map(
            (rateDto: CreateRegulationRateDto) => {
              const rate = new TripRegulationRate();
              rate.trip = savedTrip; // ⭐️ report 대신 trip에 연결
              rate.step = { id: rateDto.stepId } as TripStep;
              rate.days = rateDto.days;
              rate.rate = rateDto.rate;
              rate.details = rateDto.details;
              return rate;
            },
          );
          savedRates = await queryRunner.manager.save(rateEntities);
        }

        // 2-3. Fuel 생성 (TripReport에 연결)
        let savedFuel: TripFuelExpense | null = null;
        if (body.trip.fuel) {
          const fuel = new TripFuelExpense();
          fuel.trip = savedTrip; // ⭐️ report 대신 trip에 연결
          fuel.rate = body.trip.fuel.rate;
          fuel.mileage = body.trip.fuel.mileage;
          fuel.distance = body.trip.fuel.distance;

          savedFuel = await queryRunner.manager.save(fuel);
        }

        let savedExchangeRate: TripExchangeRate | null = null;
        if (isOverseasTrip) {
          const snapshot = await this.currencyService.getExchangeRate(
            dayjs(schedule.start).format('YYYYMMDD'),
          );

          savedExchangeRate = await queryRunner.manager.save(
            queryRunner.manager.create(TripExchangeRate, {
              trip: savedTrip,
              rate: snapshot.rate,
              appliedDate: snapshot.appliedDate,
            }),
          );
        }

        // TripReport에 관계 데이터 attach
        savedTrip.expenses = savedExpenses;
        savedTrip.rates = savedRates;
        savedTrip.fuel = savedFuel;
        savedTrip.exchangeRate = savedExchangeRate;

        saved.trip = savedTrip; // 최종 Report 객체에 연결
      }

      if (saved.project?.id) {
        await queryRunner.manager.update(
          Project,
          { id: saved.project.id },
          { updatedAt: new Date() },
        );
      }

      const schedule = saved.schedule
        ? await this.scheduleService.getSchedule(saved.schedule.id)
        : null;

      await queryRunner.commitTransaction();

      // 계산된 값들 추가
      let calculations = null;
      if (saved.trip && schedule) {
        const isDomestic = schedule.category.id === 1;
        calculations = isDomestic
          ? await this.calculateDomesticTripCosts(saved)
          : await this.calculateOverseasTripCosts(saved);
      }

      const reportDto = plainToInstance(
        ReportDto,
        {
          // Report 엔티티의 직접 속성들
          ...saved,
          schedule: schedule,
          createdBy: user,
          updatedBy: user,
          trip: saved.trip
            ? {
                isDeducted: saved.trip.isDeducted,
                // TripActualExpenseDto에는 stepId가 아닌 step이 있을 수 있으므로 DTO에 맞게 매핑 필요
                // 여기서는 TripActualExpenseDto와 TripRegulationRateDto가 stepId를 포함한다고 가정
                expenses:
                  saved.trip.expenses?.map((e) => ({
                    ...e,
                    stepId: e.step.id,
                  })) ?? [],
                rates:
                  saved.trip.rates?.map((r) => ({ ...r, stepId: r.step.id })) ??
                  [],
                fuel: saved.trip.fuel,
                exchangeRate: saved.trip.exchangeRate ?? null,
                calculations,
              }
            : null,
        },
        { excludeExtraneousValues: true },
      );
      reportDto.attachments = [];

      return reportDto;
    } catch (err) {
      console.log(err);
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async updateReport(user: User, reportId: number, body: UpdateReportDto) {
    assertWriteAccess(user);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const report = await queryRunner.manager.findOne(Report, {
        where: { id: reportId },
        relations: [
          'schedule',
          'schedule.category',
          'project',
          'createdBy',
          'updatedBy',
          'trip',
          'trip.expenses',
          'trip.rates',
          'trip.fuel',
          'trip.exchangeRate',
        ],
      });

      if (!report) throw new NotFoundException('report_not_found');

      assertOwnerOrAdmin(user, report.createdBy.id);

      if (body.content) {
        const oldUrls = extractImages(report.content);
        const newUrls = extractImages(body.content);
        const removedUrls = oldUrls.filter((url) => !newUrls.includes(url));

        for (const url of removedUrls) {
          try {
            await this.sftpService.deleteFileByUrl(url);
          } catch (e) {
            console.warn(`삭제 실패: ${url}`, e);
          }
        }

        report.content = body.content;
      }

      // --- attachments 처리 ---
      if (body.attachments) {
        const oldAttachments = report.attachments || [];
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
          await queryRunner.manager.remove(ReportAttachment, toRemove);
        }

        const remainingAttachments = oldAttachments.filter(
          (att) => !toRemove.includes(att),
        );
        const newAttachments = body.attachments
          .filter(
            (att) => !report.attachments?.some((old) => old.id === att.id),
          )
          .map((att) =>
            queryRunner.manager.create(ReportAttachment, {
              filename: att.filename,
              path: att.path,
              size: att.size,
              report: report,
            }),
          );

        report.attachments = [...remainingAttachments, ...newAttachments];
      }

      let trip = report.trip;

      const isTripReportNow =
        body.trip ||
        (trip && (trip.expenses.length || trip.rates.length || trip.fuel));

      if (!trip && isTripReportNow) {
        trip = queryRunner.manager.create(TripReport, {
          report: report,
          isDeducted: body.trip.isDeducted, // UpdateReportDto에 isDeducted가 있다고 가정
        });
        trip = await queryRunner.manager.save(trip);
        report.trip = trip;
      }

      // 2. 출장 관련 데이터가 있다면 TripReport 필드 업데이트
      if (trip) {
        const isOverseasTrip = report.schedule?.category?.id !== 1;

        // isDeducted 업데이트
        if (body.trip.isDeducted !== undefined) {
          trip.isDeducted = body.trip.isDeducted;
        }
        await queryRunner.manager.save(trip);

        if (body.trip.expenses) {
          const currentExpenseIds = trip.expenses.map((e) => e.id);
          const incomingExpenseIds = body.trip.expenses
            .map((e) => e.id)
            .filter((id) => id); // ID가 있는 항목만 필터링

          // 삭제할 항목 ID 목록
          const expensesToDelete = currentExpenseIds.filter(
            (id) => !incomingExpenseIds.includes(id),
          );

          if (expensesToDelete.length) {
            await queryRunner.manager.delete(
              TripActualExpense,
              expensesToDelete,
            );
          }

          // 생성 또는 업데이트할 항목 엔티티 생성
          const expenseEntities = body.trip.expenses.map(
            (e: UpdateActualExpenseDto) =>
              queryRunner.manager.create(TripActualExpense, {
                id: e.id,
                trip: trip, // TripReport에 연결
                step: { id: e.stepId } as TripStep,
                price: e.price,
                details: e.details,
              }),
          );
          trip.expenses = await queryRunner.manager.save(expenseEntities);
        }

        if (body.trip.rates) {
          const currentRateIds = trip.rates.map((r) => r.id);
          const incomingRateIds = body.trip.rates
            .map((r) => r.id)
            .filter((id) => id);
          const ratesToDelete = currentRateIds.filter(
            (id) => !incomingRateIds.includes(id),
          );
          if (ratesToDelete.length)
            await queryRunner.manager.delete(TripRegulationRate, ratesToDelete);

          const rateEntities = body.trip.rates.map(
            (r: UpdateRegulationRateDto) =>
              queryRunner.manager.create(TripRegulationRate, {
                id: r.id,
                trip: trip, // ⭐️ report 대신 trip에 연결
                step: { id: r.stepId } as TripStep,
                days: r.days,
                rate: r.rate,
                details: r.details,
              }),
          );
          trip.rates = await queryRunner.manager.save(rateEntities);
        }

        if (body.trip.fuel) {
          if (trip.fuel) {
            trip.fuel.rate = body.trip.fuel.rate;
            trip.fuel.mileage = body.trip.fuel.mileage;
            trip.fuel.distance = body.trip.fuel.distance;
            await queryRunner.manager.save(trip.fuel);
          } else {
            // 기존 연료 비용이 없으면 새로 생성
            const fuel = queryRunner.manager.create(TripFuelExpense, {
              trip: trip, // ⭐️ report 대신 trip에 연결
              rate: body.trip.fuel.rate,
              mileage: body.trip.fuel.mileage,
              distance: body.trip.fuel.distance,
            });
            trip.fuel = await queryRunner.manager.save(fuel);
          }
        } else if (trip.fuel) {
          // body.fuel이 없고 기존 데이터가 있으면 삭제 (OneToOne 관계 삭제 로직 필요)
          const fuelToDelete = trip.fuel;
          trip.fuel = null;
          await queryRunner.manager.save(trip);
          await queryRunner.manager.remove(fuelToDelete);
        }

        if (isOverseasTrip && !trip.exchangeRate) {
          const today = new Date();
          const snapshot = await this.currencyService.getExchangeRate(
            dayjs(today).format('YYYYMMDD'),
          );

          trip.exchangeRate = await queryRunner.manager.save(
            queryRunner.manager.create(TripExchangeRate, {
              trip,
              rate: snapshot.rate,
              appliedDate: snapshot.appliedDate,
            }),
          );
        }
      } else if (!isTripReportNow && trip) {
        // 3. 기존 TripReport였는데, 업데이트 시 모든 출장 관련 데이터가 제거된 경우
        // TripReport 엔티티와 그 하위 관계들을 정리합니다.

        // cascade 옵션을 사용하면 하위 항목은 자동으로 삭제되므로 TripReport만 제거
        await queryRunner.manager.remove(trip);
        report.trip = null; // Report에서 관계 제거
      }

      // 🚨 isDeducted 필드는 Report에서 제거되었으므로, Report 엔티티 업데이트에서 제거합니다.
      // report.isDeducted = body.isDeducted; // 이 줄 제거

      report.updatedBy = user;
      const saved = await queryRunner.manager.save(report);
      if (saved.project?.id) {
        await queryRunner.manager.update(
          Project,
          { id: saved.project.id },
          { updatedAt: new Date() },
        );
      }

      // ... (commitTransaction 및 DTO 반환 로직은 createReport와 유사하게 TripReport 데이터를 매핑하여 수정)
      await queryRunner.commitTransaction();

      const schedule = saved.schedule
        ? await this.scheduleService.getSchedule(saved.schedule.id)
        : null;

      // 계산된 값들 추가
      let calculations = null;
      if (saved.trip && schedule) {
        const isDomestic = schedule.category.id === 1;
        calculations = isDomestic
          ? await this.calculateDomesticTripCosts(saved)
          : await this.calculateOverseasTripCosts(saved);
      }

      const reportDto = plainToInstance(
        ReportDto,
        {
          // Report 엔티티의 직접 속성들
          ...saved,
          schedule: schedule,
          createdBy: saved.createdBy,
          updatedBy: saved.updatedBy,
          trip: saved.trip
            ? {
                isDeducted: saved.trip.isDeducted,
                expenses:
                  saved.trip.expenses?.map((e) => ({
                    ...e,
                    stepId: e.step.id,
                  })) ?? [],
                rates:
                  saved.trip.rates?.map((r) => ({ ...r, stepId: r.step.id })) ??
                  [],
                fuel: saved.trip.fuel,
                exchangeRate: saved.trip.exchangeRate ?? null,
                calculations,
              }
            : null,
        },
        { excludeExtraneousValues: true },
      );

      return reportDto;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async deleteReport(user: User, id: number) {
    assertWriteAccess(user);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const report = await queryRunner.manager.findOne(Report, {
        where: { id },
        relations: ['trip', 'attachments'],
      });

      if (!report) {
        throw new NotFoundException('report_not_found');
      }

      // 연관된 TripReport soft delete (유니크 제약 조건 위반 방지)
      if (report.trip) {
        await queryRunner.manager.softDelete(TripReport, report.trip.id);
      }

      // Attachments는 파일을 아카이브 폴더로 이동 후 DB는 soft delete (복구 가능)
      if (report.attachments?.length) {
        // SFTP에서 파일 아카이브
        for (const att of report.attachments) {
          try {
            await this.sftpService.archiveFileByPath(att.path);
          } catch (e) {
            console.warn(`파일 아카이브 실패: ${att.path}`, e);
          }
        }
        await queryRunner.manager.softDelete(
          ReportAttachment,
          report.attachments.map((att) => att.id),
        );
      }

      await queryRunner.manager.softDelete(Report, id);

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}

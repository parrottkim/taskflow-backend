import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { DataSource, Repository } from 'typeorm';
import {
  CreateActualExpenseDto,
  CreateRegulationRateDto,
  CreateReportDto,
} from './dto/create-report';
import { ScheduleService } from 'src/schedule/schedule.service';
import { Report } from 'src/entity/report/report.entity';
import { ReportDto, ReportListDto } from './dto/report';
import {
  UpdateActualExpenseDto,
  UpdateRegulationRateDto,
  UpdateReportDto,
} from './dto/update-report';
import { GetReportDto } from './dto/get-report';
import { UserService } from 'src/user/user.service';
import { User } from 'src/entity/user/user.entity';
import * as path from 'path';
import * as ExcelJS from 'exceljs';
import * as dayjs from 'dayjs';
import { CurrencyService } from 'src/currency/currency.service';
import * as FormData from 'form-data';
import axios from 'axios';
import { TripReport } from 'src/entity/report/trip/trip-report.entity';
import { TripFuelExpense } from 'src/entity/report/trip/trip-fuel-expense.entity';
import { TripActualExpense } from 'src/entity/report/trip/trip-actual-expense.entity';
import { TripCategory } from 'src/entity/report/trip/trip-category.entity';
import { TripRegulationRate } from 'src/entity/report/trip/trip-regulation-rate.entity';
import { TripRegulation } from 'src/entity/report/trip/trip-regulation.entity';
import { TripStep } from 'src/entity/report/trip/trip-step.entity';
import { TripCategoryDto } from './dto/trip/trip-category';
import { TripStepDto } from './dto/trip/trip-step';
import { TripRegulationDto } from './dto/trip/trip-regulation';
import { ReportAttachment } from 'src/entity/report/report-attachment.entity';
import { extractImages } from 'src/common/utils/markdown.util';
import { SftpService } from 'src/sftp/sftp.service';
import { MailService } from 'src/mail/mail.service';
import { ProjectService } from 'src/project/project.service';

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
      .leftJoinAndSelect('report.schedule', 'schedule')
      .leftJoinAndSelect('schedule.project', 'project')
      .leftJoinAndSelect('report.user', 'user')
      .leftJoinAndSelect('user.department', 'department')
      .leftJoinAndSelect('report.trip', 'trip')
      .leftJoinAndSelect('trip.expenses', 'expense')
      .leftJoinAndSelect('expense.step', 'expenseStep')
      .leftJoinAndSelect('trip.rates', 'rate')
      .leftJoinAndSelect('rate.step', 'rateStep')
      .leftJoinAndSelect('trip.fuel', 'fuel')
      .leftJoinAndSelect('report.attachments', 'attachment')
      .where('report.id = :id', { id })
      .getOne();
  }

  async findReports(value: GetReportDto) {
    return await this.reportRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.schedule', 'schedule')
      .leftJoinAndSelect('schedule.project', 'project')
      .leftJoinAndSelect('report.user', 'user')
      .leftJoinAndSelect('report.trip', 'trip')
      .leftJoinAndSelect('trip.expenses', 'expense')
      .leftJoinAndSelect('expense.step', 'expenseStep')
      .leftJoinAndSelect('trip.rates', 'rate')
      .leftJoinAndSelect('rate.step', 'rateStep')
      .leftJoinAndSelect('trip.fuel', 'fuel')
      .leftJoinAndSelect('report.attachments', 'attachment')
      .where('project.id = :id', { id: value.projectId })
      .orderBy('report.createdAt', 'DESC')
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
    const TEMPLATE_FILE_NAME = 'template.xlsx';

    // ❌ 임시 디렉토리/파일 관련 변수 제거 (XLSX_PATH_LOCAL, TEMP_DIR_LOCAL 등)
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
        fitToPage: true,
        fitToHeight: 1,
        fitToWidth: 1,
        horizontalCentered: true,
        verticalCentered: true,
        margins: {
          left: 0.5,
          right: 0.5,
          top: 0.5,
          bottom: 0.5,
          header: 0,
          footer: 0,
        },
      };

      const timeDiff =
        new Date(new Date(report.schedule.end).getTime() - 1).getTime() -
        report.schedule.start.getTime();
      const durationDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1;
      const durationNights = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
      const duration =
        durationDays === 1
          ? '당일 출장'
          : `${durationNights}박 ${durationDays}일`;

      // 데이터 채우기 (개요 시트)
      worksheet.getCell('C3').value = report.user.department.name;
      worksheet.getCell('C4').value = schedule.summary;
      worksheet.getCell('G3').value = report.user.username;
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

        const ulsanAccomodationExpenses = report.trip.expenses.filter(
          (expense) => expense.step.id == 7,
        );
        const ulsanAccomodationRate = report.trip.rates.find(
          (rate) => rate.step.id == 7,
        ) ?? { rate: 0, days: 0 };
        const totalUlsanAccomodationRate =
          ulsanAccomodationRate.rate * ulsanAccomodationRate.days;
        const totalUlsanAccomadationExpenses = ulsanAccomodationExpenses.reduce(
          (sum, expense) => {
            return sum + expense.price;
          },
          0,
        );
        const ulsanAccomodationDetails = ulsanAccomodationExpenses
          .map((expense) => expense.details)
          .filter((details) => details)
          .join(', ');

        worksheet.getCell('E26').value = ulsanAccomodationRate.rate;
        worksheet.getCell('F26').value = ulsanAccomodationRate.days;
        worksheet.getCell('G26').value = totalUlsanAccomodationRate;
        worksheet.getCell('H26').value = totalUlsanAccomadationExpenses;
        worksheet.getCell('I26').value = ulsanAccomodationDetails;

        const notUlsanAccomodationExpenses = report.trip.expenses.filter(
          (expense) => expense.step.id == 8,
        );
        const notUlsanAccomodationRate = report.trip.rates.find(
          (rate) => rate.step.id == 8,
        ) ?? { rate: 0, days: 0 };
        const totalNotUlsanAccomodationRate =
          notUlsanAccomodationRate.rate * notUlsanAccomodationRate.days;
        const totalNotUlsanAccomodationExpenses =
          notUlsanAccomodationExpenses.reduce((sum, expense) => {
            return sum + expense.price;
          }, 0);
        const notUlsanAccomodationDetails = notUlsanAccomodationExpenses
          .map((expense) => expense.details)
          .filter((details) => details)
          .join(', ');

        worksheet.getCell('E27').value = notUlsanAccomodationRate.rate;
        worksheet.getCell('F27').value = notUlsanAccomodationRate.days;
        worksheet.getCell('G27').value = totalNotUlsanAccomodationRate;
        worksheet.getCell('H27').value = totalNotUlsanAccomodationExpenses;
        worksheet.getCell('I27').value = notUlsanAccomodationDetails;

        const weekdayAccomodationExpenses = report.trip.expenses.filter(
          (expense) => expense.step.id == 9,
        );
        const weekdayAccomodationRate = report.trip.rates.find(
          (rate) => rate.step.id == 9,
        ) ?? { rate: 0, days: 0 };
        const totalWeekdayAccomodationRate =
          weekdayAccomodationRate.rate * weekdayAccomodationRate.days;
        const totalWeekdayAccomdationExpenses =
          weekdayAccomodationExpenses.reduce((sum, expense) => {
            return sum + expense.price;
          }, 0);
        const weekdayAccomdationDetails = weekdayAccomodationExpenses
          .map((expense) => expense.details)
          .filter((details) => details)
          .join(', ');

        worksheet.getCell('E28').value = weekdayAccomodationRate.rate;
        worksheet.getCell('F28').value = weekdayAccomodationRate.days;
        worksheet.getCell('G28').value = totalWeekdayAccomodationRate;
        worksheet.getCell('H28').value = totalWeekdayAccomdationExpenses;
        worksheet.getCell('I28').value = weekdayAccomdationDetails;

        const accomodationRate =
          totalUlsanAccomodationRate +
          totalNotUlsanAccomodationRate +
          totalWeekdayAccomodationRate;

        worksheet.getCell('G29').value = accomodationRate;

        const accomodationCost =
          totalUlsanAccomadationExpenses +
          totalNotUlsanAccomodationExpenses +
          totalWeekdayAccomdationExpenses;

        worksheet.getCell('H29').value = accomodationCost;

        const accomodationSettlement = accomodationRate - accomodationCost;

        worksheet.getCell('H30').value = accomodationSettlement;

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
          accomodationRate +
          dailyRate +
          otherCost;
        worksheet.getCell('H47').value = accomodationSettlement;
        worksheet.getCell('H48').value = dailyRate + totalPersonalFuel;
      } else {
        const today = new Date();
        const exchange = await this.currencyService.getExchangeRate(
          dayjs(today).format('YYYYMMDD'),
        );

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

        const accomodationExpenses = report.trip.expenses.filter(
          (expense) => expense.step.id == 20,
        );
        const totalAccomodation = accomodationExpenses.reduce(
          (sum, expense) => {
            return sum + expense.price;
          },
          0,
        );
        const accomodationDetails = accomodationExpenses
          .map((expense) => expense.details)
          .filter((details) => details)
          .join(', ');

        worksheet.getCell('H28').value = totalAccomodation;
        worksheet.getCell('I28').value = accomodationDetails;
        worksheet.getCell('H30').value = totalAccomodation;

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

        worksheet.getCell('E35').value = exchange;

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

        const totalDailyRate = amountReceived * exchange;

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
          totalAccomodation +
          totalDailyRate +
          otherCost;
      }

      const xlsxBuffer = await workbook.xlsx.writeBuffer();

      const form = new FormData();
      // 💡 [변경] fs.createReadStream 대신 메모리 버퍼를 직접 전달합니다.
      form.append('files', xlsxBuffer, {
        filename: `${PATH_FILENAME}.xlsx`,
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const response = await axios.post(
        `http://doc-converter:3001/forms/libreoffice/convert`,
        form,
        {
          headers: {
            ...form.getHeaders(),
          },
          responseType: 'arraybuffer', // PDF 파일을 버퍼로 받기 위함
          timeout: 30000, // 30초 타임아웃
        },
      );

      const buffer = response.data;
      const filename = `${PATH_FILENAME}.pdf`;

      return { buffer, filename };
    } catch (e) {
      throw e;
    }
  }

  async getReportWithoutUser(id: number) {
    const report = await this.findReportById(id);

    if (!report) {
      throw new NotFoundException('report_not_found');
    }

    const schedule = await this.scheduleService.getSchedule(report.schedule.id);

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
            }
          : null,
      },
      {
        excludeExtraneousValues: true,
      },
    );

    return reportDto;
  }

  async getReportWithUser(user: User, id: number) {
    const report = await this.findReportById(id);

    if (!report) {
      throw new NotFoundException('report_not_found');
    }

    if (report.user.id !== user.id && !user.isAdmin) {
      throw new ForbiddenException('no_permission');
    }

    const schedule = await this.scheduleService.getSchedule(report.schedule.id);

    const reportDto = plainToInstance(
      ReportDto,
      {
        ...report,
        schedule,
        user,
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
            }
          : null,
      },
      {
        excludeExtraneousValues: true,
      },
    );

    return reportDto;
  }

  async getReports(value: GetReportDto) {
    const [reports, total] = await this.findReports(value);

    const items = await Promise.all(
      reports.map(async (report) => {
        const schedule = await this.scheduleService.getSchedule(
          report.schedule.id,
        );
        const user = await this.userService.getUser(report.user.id);

        const reportDto = plainToInstance(
          ReportDto,
          {
            ...report,
            schedule,
            user,
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
      page: value.page,
      total: total,
    });

    return reportListDto;
  }

  async sendMail(id: number) {
    const report = await this.findReportById(id);
    const schedule = await this.scheduleService.getSchedule(report.schedule.id);
    const project = await this.projectService.getProjectWithoutUser(
      report.schedule.project.id,
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
            }
          : null,
      },
      {
        excludeExtraneousValues: true,
      },
    );

    await this.mailService.sendReportMail(project, reportDto);
  }

  async createReport(user: any, value: CreateReportDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const isTripReport = value.trip;

    try {
      const initialSchedule = await this.scheduleService.findScheduleById(
        value.scheduleId,
      );

      if (!initialSchedule) {
        throw new NotFoundException('schedule_not_found');
      }

      const existingReport = await queryRunner.manager.findOne(Report, {
        where: { schedule: { id: value.scheduleId } },
      });

      if (existingReport) {
        throw new ConflictException('report_exists');
      }

      const report = queryRunner.manager.create(Report, {
        schedule: initialSchedule,
        user: user,
        description: value.content,
      });

      const saved = await queryRunner.manager.save(report);

      if (isTripReport) {
        const trip = queryRunner.manager.create(TripReport, {
          report: saved, // Report와의 OneToOne 관계 설정
          isDeducted: value.trip.isDeducted, // isDeducted는 TripReport로 이동
        });
        const savedTrip = await queryRunner.manager.save(trip);

        // 2-1. Expense 생성 (TripReport에 연결)
        if (value.trip.expenses) {
          const expenseEntities = value.trip.expenses.map(
            (expenseDto: CreateActualExpenseDto) => {
              const expense = new TripActualExpense();
              expense.trip = savedTrip; // ⭐️ report 대신 trip에 연결
              expense.step = { id: expenseDto.stepId } as TripStep;
              expense.price = expenseDto.price;
              expense.details = expenseDto.details;
              return expense;
            },
          );
          await queryRunner.manager.save(expenseEntities);
          // savedTrip.expenses = savedExpenses; // DTO 반환 시 필요 없으면 생략 가능
        }

        // 2-2. Rate 생성 (TripReport에 연결)
        if (value.trip.rates) {
          const rateEntities = value.trip.rates.map(
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
          await queryRunner.manager.save(rateEntities);
        }

        // 2-3. Fuel 생성 (TripReport에 연결)
        if (value.trip.fuel) {
          const fuel = new TripFuelExpense();
          fuel.trip = savedTrip; // ⭐️ report 대신 trip에 연결
          fuel.rate = value.trip.fuel.rate;
          fuel.mileage = value.trip.fuel.mileage;
          fuel.distance = value.trip.fuel.distance;

          await queryRunner.manager.save(fuel);
        }

        saved.trip = savedTrip; // 최종 Report 객체에 연결
      }

      const schedule = await this.scheduleService.getSchedule(
        report.schedule.id,
      );

      await queryRunner.commitTransaction();

      const reportDto = plainToInstance(
        ReportDto,
        {
          // Report 엔티티의 직접 속성들
          ...saved,
          schedule: schedule,
          user: user,
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
              }
            : null,
        },
        { excludeExtraneousValues: true },
      );
      reportDto.attachments = [];

      return reportDto;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async updateReport(user: any, reportId: number, value: UpdateReportDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const report = await queryRunner.manager.findOne(Report, {
        where: { id: reportId },
        relations: [
          'schedule',
          'schedule.category',
          'user',
          'trip',
          'trip.expenses',
          'trip.rates',
          'trip.fuel',
        ],
      });

      if (!report) throw new NotFoundException('report_not_found');

      if (report.user.id !== user.id && !user.isAdmin)
        throw new ForbiddenException('no_permission');

      if (typeof value.content === 'string') {
        const oldUrls = extractImages(report.content);
        const newUrls = extractImages(value.content);
        const removedUrls = oldUrls.filter((url) => !newUrls.includes(url));

        for (const url of removedUrls) {
          try {
            await this.sftpService.deleteFileByUrl(url);
          } catch (e) {
            console.warn(`삭제 실패: ${url}`, e);
          }
        }

        report.content = value.content;
      }

      // --- attachments 처리 ---
      if (value.attachments) {
        const oldAttachments = report.attachments || [];
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
          await queryRunner.manager.remove(ReportAttachment, toRemove);
        }

        const remainingAttachments = oldAttachments.filter(
          (att) => !toRemove.includes(att),
        );
        const newAttachments = value.attachments
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
      const hasTripDataInValue = value.trip;
      const isTripReportNow =
        hasTripDataInValue ||
        (trip && (trip.expenses.length || trip.rates.length || trip.fuel));

      if (!trip && isTripReportNow) {
        trip = queryRunner.manager.create(TripReport, {
          report: report,
          isDeducted: value.trip.isDeducted, // UpdateReportDto에 isDeducted가 있다고 가정
        });
        trip = await queryRunner.manager.save(trip);
        report.trip = trip;
      }

      // 2. 출장 관련 데이터가 있다면 TripReport 필드 업데이트
      if (trip) {
        // isDeducted 업데이트
        if (value.trip.isDeducted !== undefined) {
          trip.isDeducted = value.trip.isDeducted;
        }
        await queryRunner.manager.save(trip);

        if (value.trip.expenses) {
          const currentExpenseIds = trip.expenses.map((e) => e.id);
          const incomingExpenseIds = value.trip.expenses
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
          const expenseEntities = value.trip.expenses.map(
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

        if (value.trip.rates) {
          const currentRateIds = trip.rates.map((r) => r.id);
          const incomingRateIds = value.trip.rates
            .map((r) => r.id)
            .filter((id) => id);
          const ratesToDelete = currentRateIds.filter(
            (id) => !incomingRateIds.includes(id),
          );
          if (ratesToDelete.length)
            await queryRunner.manager.delete(TripRegulationRate, ratesToDelete);

          const rateEntities = value.trip.rates.map(
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

        if (value.trip.fuel) {
          if (trip.fuel) {
            trip.fuel.rate = value.trip.fuel.rate;
            trip.fuel.mileage = value.trip.fuel.mileage;
            trip.fuel.distance = value.trip.fuel.distance;
            await queryRunner.manager.save(trip.fuel);
          } else {
            // 기존 연료 비용이 없으면 새로 생성
            const fuel = queryRunner.manager.create(TripFuelExpense, {
              trip: trip, // ⭐️ report 대신 trip에 연결
              rate: value.trip.fuel.rate,
              mileage: value.trip.fuel.mileage,
              distance: value.trip.fuel.distance,
            });
            trip.fuel = await queryRunner.manager.save(fuel);
          }
        } else if (trip.fuel) {
          // value.fuel이 없고 기존 데이터가 있으면 삭제 (OneToOne 관계 삭제 로직 필요)
          const fuelToDelete = trip.fuel;
          trip.fuel = null;
          await queryRunner.manager.save(trip);
          await queryRunner.manager.remove(fuelToDelete);
        }
      } else if (!isTripReportNow && trip) {
        // 3. 기존 TripReport였는데, 업데이트 시 모든 출장 관련 데이터가 제거된 경우
        // TripReport 엔티티와 그 하위 관계들을 정리합니다.

        // cascade 옵션을 사용하면 하위 항목은 자동으로 삭제되므로 TripReport만 제거
        await queryRunner.manager.remove(trip);
        report.trip = null; // Report에서 관계 제거
      }

      // 🚨 isDeducted 필드는 Report에서 제거되었으므로, Report 엔티티 업데이트에서 제거합니다.
      // report.isDeducted = value.isDeducted; // 이 줄 제거

      const saved = await queryRunner.manager.save(report);

      // ... (commitTransaction 및 DTO 반환 로직은 createReport와 유사하게 TripReport 데이터를 매핑하여 수정)
      await queryRunner.commitTransaction();

      const schedule = await this.scheduleService.getSchedule(
        saved.schedule.id,
      );

      const reportDto = plainToInstance(
        ReportDto,
        {
          // Report 엔티티의 직접 속성들
          ...saved,
          schedule: schedule,
          user: user,
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

  async deleteReport(id: number) {
    await this.reportRepository.softDelete(id);
  }
}

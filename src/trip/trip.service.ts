import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { DataSource, Repository } from 'typeorm';
import { TripStep } from 'src/entity/trip/trip-step.entity';
import { TripCategory } from 'src/entity/trip/trip-category.entity';
import { TripCategoryDto } from './dto/trip-category';
import { TripStepDto } from './dto/trip-step';
import { TripRegulationDto } from './dto/trip-regulation';
import { TripRegulation } from 'src/entity/trip/trip-regulation.entity';
import {
  CreateActualExpenseDto,
  CreateRegulationRateDto,
  CreateTripDto,
} from './dto/create-trip';
import { ScheduleService } from 'src/schedule/schedule.service';
import { Trip } from 'src/entity/trip/trip.entity';
import { TripActualExpense } from 'src/entity/trip/trip-actual-expense.entity';
import { TripRegulationRate } from 'src/entity/trip/trip-regulation-rate.entity';
import { TripDto, TripListDto } from './dto/trip';
import {
  UpdateActualExpenseDto,
  UpdateRegulationRateDto,
  UpdateTripDto,
} from './dto/update-trip';
import { GetTripDto } from './dto/get-trip';
import { UserService } from 'src/user/user.service';
import { User } from 'src/entity/user/user.entity';
import { TripFuelExpense } from 'src/entity/trip/trip-fuel-expense.entity';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as ExcelJS from 'exceljs';
import { v4 as uuidv4 } from 'uuid';
import * as dayjs from 'dayjs';
import { CurrencyService } from 'src/currency/currency.service';
import * as FormData from 'form-data';
import axios from 'axios';

@Injectable()
export class TripService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Trip)
    private readonly tripRepository: Repository<Trip>,
    @InjectRepository(TripCategory)
    private readonly tripCategoryRepository: Repository<TripCategory>,
    @InjectRepository(TripStep)
    private readonly tripStepRepository: Repository<TripStep>,
    @InjectRepository(TripRegulation)
    private readonly tripRegulationRepository: Repository<TripRegulation>,
    private readonly scheduleService: ScheduleService,
    private readonly userService: UserService,
    private readonly currencyService: CurrencyService,
  ) {}

  async findAllCategories() {
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

  async findAllSteps(id: number) {
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

  async findAllRegulations(id: number) {
    return await this.tripRegulationRepository
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

  async findTripById(id: number) {
    return await this.tripRepository
      .createQueryBuilder('trip')
      .leftJoinAndSelect('trip.schedule', 'schedule')
      .leftJoinAndSelect('schedule.project', 'project')
      .leftJoinAndSelect('trip.user', 'user')
      .leftJoinAndSelect('user.department', 'department')
      .leftJoinAndSelect('trip.expenses', 'expense')
      .leftJoinAndSelect('expense.step', 'expenseStep')
      .leftJoinAndSelect('trip.rates', 'rate')
      .leftJoinAndSelect('rate.step', 'rateStep')
      .leftJoinAndSelect('trip.fuel', 'fuel')
      .where('trip.id = :id', { id })
      .getOne();
  }

  async findTrips(value: GetTripDto) {
    return await this.tripRepository
      .createQueryBuilder('trip')
      .leftJoinAndSelect('trip.schedule', 'schedule')
      .leftJoinAndSelect('schedule.project', 'project')
      .leftJoinAndSelect('trip.user', 'user')
      .leftJoinAndSelect('trip.expenses', 'expense')
      .leftJoinAndSelect('expense.step', 'expenseStep')
      .leftJoinAndSelect('trip.rates', 'rate')
      .leftJoinAndSelect('rate.step', 'rateStep')
      .leftJoinAndSelect('trip.fuel', 'fuel')
      .where('project.id = :id', { id: value.projectId })
      .orderBy('trip.createdAt', 'DESC')
      .skip((value.page - 1) * value.limit)
      .take(value.limit)
      .getManyAndCount();
  }

  async getAllCategories() {
    const categories = await this.findAllCategories();

    const result = plainToInstance(TripCategoryDto, categories, {
      excludeExtraneousValues: true,
    });

    return result;
  }

  async getAllSteps(id: number) {
    const steps = await this.findAllSteps(id);

    const result = plainToInstance(TripStepDto, steps, {
      excludeExtraneousValues: true,
    });

    return result;
  }

  async getAllRegulations(id: number) {
    const regulations = await this.findAllRegulations(id);

    const result = plainToInstance(TripRegulationDto, regulations, {
      excludeExtraneousValues: true,
      enableImplicitConversion: true,
    });

    return result;
  }

  // 🌟 exportTrip 함수 수정됨: 요청별 고유 폴더 사용 및 필요한 시트만 남기고 변환
  async exportTrip(id: number) {
    const TEMPLATE_BASE_PATH = path.join(process.cwd(), 'templates');
    const TEMPLATE_FILE_NAME = 'template.xlsx';

    // ❌ 임시 디렉토리/파일 관련 변수 제거 (XLSX_PATH_LOCAL, TEMP_DIR_LOCAL 등)
    const PATH_FILENAME = `trip_${id}_filled`;
    const TEMPLATE_PATH = path.join(TEMPLATE_BASE_PATH, TEMPLATE_FILE_NAME);

    const trip = await this.findTripById(id);
    if (!trip) throw new NotFoundException('trip_not_found');

    const schedule = await this.scheduleService.getSchedule(trip.schedule.id);
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
        new Date(new Date(trip.schedule.end).getTime() - 1).getTime() -
        trip.schedule.start.getTime();
      const durationDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1;
      const durationNights = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
      const duration =
        durationDays === 1
          ? '당일 출장'
          : `${durationNights}박 ${durationDays}일`;

      // 데이터 채우기 (개요 시트)
      worksheet.getCell('C3').value = trip.user.department.name;
      worksheet.getCell('C4').value = schedule.summary;
      worksheet.getCell('G3').value = trip.user.username;
      worksheet.getCell('C5').value = dayjs(schedule.start).format(
        'YYYY.MM.DD',
      );
      worksheet.getCell('C6').value = dayjs(schedule.end).format('YYYY.MM.DD');
      worksheet.getCell('C7').value = duration;
      worksheet.getCell('J4').value = schedule.projectClientName;
      worksheet.getCell('J5').value = schedule.projectCode;
      worksheet.getCell('A12').value = schedule.description ?? '';

      if (isDomestic) {
        const airfareExpenses = trip.expenses.filter(
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

        const trainFareExpenses = trip.expenses.filter(
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

        const otherTransitExpenses = trip.expenses.filter(
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

        const parkingFeeExpenses = trip.expenses.filter(
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

        const taxiFareExpenses = trip.expenses.filter(
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

        const busFareExpenses = trip.expenses.filter(
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

        const ulsanAccomodationExpenses = trip.expenses.filter(
          (expense) => expense.step.id == 7,
        );
        const ulsanAccomodationRate = trip.rates.find(
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

        const notUlsanAccomodationExpenses = trip.expenses.filter(
          (expense) => expense.step.id == 8,
        );
        const notUlsanAccomodationRate = trip.rates.find(
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

        const weekdayAccomodationExpenses = trip.expenses.filter(
          (expense) => expense.step.id == 9,
        );
        const weekdayAccomodationRate = trip.rates.find(
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

        const weekdayDailyRate = trip.rates.find(
          (rate) => rate.step.id == 10,
        ) ?? { rate: 0, days: 0 };
        const totalWeekdayDailyRate =
          weekdayDailyRate.rate * weekdayDailyRate.days;

        worksheet.getCell('E33').value = weekdayDailyRate.rate;
        worksheet.getCell('F33').value = weekdayDailyRate.days;
        worksheet.getCell('H33').value = totalWeekdayDailyRate;

        const weekendDailyRate = trip.rates.find(
          (rate) => rate.step.id == 11,
        ) ?? { rate: 0, days: 0 };
        const totalWeekendDailyRate =
          weekendDailyRate.rate * weekendDailyRate.days;

        worksheet.getCell('E34').value = weekendDailyRate.rate;
        worksheet.getCell('F34').value = weekendDailyRate.days;
        worksheet.getCell('H34').value = totalWeekendDailyRate;

        const dailyRate = totalWeekdayDailyRate + totalWeekendDailyRate;

        worksheet.getCell('H35').value = dailyRate;

        const otherSettlementExpenses = trip.expenses.filter(
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

        const corporateFuelExpenses = trip.expenses.filter(
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

        const personalFuelExpenses = trip.fuel;
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

        const airfareExpenses = trip.expenses.filter(
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

        const taxiFareExpense = trip.expenses.filter(
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

        const pickupFeeExpense = trip.expenses.filter(
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

        const parkingFeeExpenses = trip.expenses.filter(
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

        const localTaxiFareExpenses = trip.expenses.filter(
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

        const rentalFeeExpenses = trip.expenses.filter(
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

        const accomodationExpenses = trip.expenses.filter(
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

        const managerDailyRate = trip.rates.find(
          (rate) => rate.step.id === 21,
        ) ?? { rate: 0, days: 0 };
        const totalManagerDailyRate =
          managerDailyRate.rate * managerDailyRate.days;

        worksheet.getCell('E32').value = managerDailyRate.rate;
        worksheet.getCell('F32').value = managerDailyRate.days;
        worksheet.getCell('H32').value = totalManagerDailyRate;

        const seniorDailyRate = trip.rates.find(
          (rate) => rate.step.id === 22,
        ) ?? { rate: 0, days: 0 };
        const totalSeniorDailyRate =
          seniorDailyRate.rate * seniorDailyRate.days;

        worksheet.getCell('E33').value = seniorDailyRate.rate;
        worksheet.getCell('F33').value = seniorDailyRate.days;
        worksheet.getCell('H33').value = totalSeniorDailyRate;

        const otherDailyRate = trip.rates.find(
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

        const deducted = trip.isDeducted ? 0.1 : 0.0;

        worksheet.getCell('H36').value = deducted;

        const holidayRate = trip.rates.find((rate) => rate.step.id === 24) ?? {
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

        const insuranceExpenses = trip.expenses.filter(
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

        const usimExpenses = trip.expenses.filter(
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

        const loamingExpenses = trip.expenses.filter(
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

        const testExpenses = trip.expenses.filter(
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

        const otherChargeExpenses = trip.expenses.filter(
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
        `http://doc-converter:3000/forms/libreoffice/convert`,
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

  async getTripWithUser(user: User, id: number) {
    const trip = await this.findTripById(id);

    if (!trip) {
      throw new NotFoundException('trip_not_found');
    }

    if (trip.user.id !== user.id && !user.isAdmin) {
      throw new ForbiddenException('no_permission');
    }

    const schedule = await this.scheduleService.getSchedule(trip.schedule.id);

    const expenses = trip.expenses.map((expense) => ({
      ...expense,
      stepId: expense.step?.id, // step 객체에서 ID 추출
    }));

    const rates = trip.rates.map((rate) => ({
      ...rate,
      stepId: rate.step?.id, // step 객체에서 ID 추출
    }));

    const tripDto = plainToInstance(
      TripDto,
      { ...trip, schedule, user, expenses, rates },
      {
        excludeExtraneousValues: true,
      },
    );

    return tripDto;
  }

  async getTrips(value: GetTripDto) {
    const [trips, total] = await this.findTrips(value);

    const items = await Promise.all(
      trips.map(async (trip) => {
        const schedule = await this.scheduleService.getSchedule(
          trip.schedule.id,
        );
        const user = await this.userService.getUser(trip.user.id);

        const expenses = trip.expenses.map((expense) => ({
          ...expense,
          stepId: expense.step?.id, // step 객체에서 ID 추출
        }));

        const rates = trip.rates.map((rate) => ({
          ...rate,
          stepId: rate.step?.id, // step 객체에서 ID 추출
        }));

        const tripDto = plainToInstance(
          TripDto,
          { ...trip, schedule, user, expenses, rates },
          {
            excludeExtraneousValues: true,
          },
        );

        return tripDto;
      }),
    );

    const tripListDto = plainToInstance(TripListDto, {
      items: items,
      page: value.page,
      total: total,
    });

    return tripListDto;
  }

  async createTrip(user: any, value: CreateTripDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const initialSchedule = await this.scheduleService.findScheduleById(
        value.scheduleId,
      );

      if (!initialSchedule) {
        throw new NotFoundException('schedule_not_found');
      }

      const trip = queryRunner.manager.create(Trip, {
        schedule: initialSchedule,
        user: user,
        isDeducted: value.isDeducted,
      });

      const saved = await queryRunner.manager.save(trip);

      if (value.expenses) {
        const expenseEntities = value.expenses.map(
          (expenseDto: CreateActualExpenseDto) => {
            const expense = new TripActualExpense();
            expense.trip = saved;
            expense.step = { id: expenseDto.stepId } as TripStep;
            expense.price = expenseDto.price;
            expense.details = expenseDto.details;
            return expense;
          },
        );
        const savedExpenses = await queryRunner.manager.save(expenseEntities);
        trip.expenses = savedExpenses;
      }

      if (value.rates) {
        const rateEntities = value.rates.map(
          (rateDto: CreateRegulationRateDto) => {
            const rate = new TripRegulationRate();
            rate.trip = saved;
            rate.step = { id: rateDto.stepId } as TripStep;
            rate.days = rateDto.days;
            rate.rate = rateDto.rate;
            rate.details = rateDto.details;
            return rate;
          },
        );
        const savedRates = await queryRunner.manager.save(rateEntities);
        trip.rates = savedRates;
      }

      if (value.fuel) {
        const fuel = new TripFuelExpense();
        fuel.trip = saved;
        fuel.rate = value.fuel.rate;
        fuel.mileage = value.fuel.mileage;
        fuel.distance = value.fuel.distance;

        const savedFuel = await queryRunner.manager.save(fuel);
        trip.fuel = savedFuel;
      }

      const schedule = await this.scheduleService.getSchedule(trip.schedule.id);

      await queryRunner.commitTransaction();

      return plainToInstance(
        TripDto,
        {
          ...trip,
          schedule: schedule,
          user: user,
          rates: trip.rates.map((rate) => ({
            ...rate,
            stepId: rate.step?.id,
          })),
          expenses: trip.expenses.map((expense) => ({
            ...expense,
            stepId: expense.step?.id,
          })),
          fuel: trip.fuel,
          isDeducted: value.isDeducted,
        },
        { excludeExtraneousValues: true },
      );
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async updateTrip(user: any, tripId: number, value: UpdateTripDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const trip = await queryRunner.manager.findOne(Trip, {
        where: { id: tripId },
        relations: ['schedule', 'user', 'expenses', 'rates', 'fuel'],
      });

      if (!trip) throw new NotFoundException('trip_not_found');
      if (trip.user.id !== user.id && !user.isAdmin)
        throw new ForbiddenException('no_permission');

      /** 1. 규정 요율 업데이트/추가/삭제 */
      if (value.rates) {
        const currentRateIds = trip.rates.map((r) => r.id);
        const incomingRateIds = value.rates.map((r) => r.id).filter((id) => id);
        const ratesToDelete = currentRateIds.filter(
          (id) => !incomingRateIds.includes(id),
        );
        if (ratesToDelete.length)
          await queryRunner.manager.delete(TripRegulationRate, ratesToDelete);

        const rateEntities = value.rates.map((r: UpdateRegulationRateDto) =>
          queryRunner.manager.create(TripRegulationRate, {
            id: r.id,
            trip,
            step: { id: r.stepId } as TripStep,
            days: r.days,
            rate: r.rate,
            details: r.details,
          }),
        );
        trip.rates = await queryRunner.manager.save(rateEntities);
      }

      /** 2. 실제 지출 업데이트/추가/삭제 */
      if (value.expenses) {
        const currentExpenseIds = trip.expenses.map((e) => e.id);
        const incomingExpenseIds = value.expenses
          .map((e) => e.id)
          .filter((id) => id);
        const expensesToDelete = currentExpenseIds.filter(
          (id) => !incomingExpenseIds.includes(id),
        );
        if (expensesToDelete.length)
          await queryRunner.manager.delete(TripActualExpense, expensesToDelete);

        const expenseEntities = value.expenses.map(
          (e: UpdateActualExpenseDto) =>
            queryRunner.manager.create(TripActualExpense, {
              id: e.id,
              trip,
              step: { id: e.stepId } as TripStep,
              price: e.price,
              details: e.details,
            }),
        );
        trip.expenses = await queryRunner.manager.save(expenseEntities);
      }

      /** 3. 연료 비용 업데이트/추가/삭제 */
      if (value.fuel) {
        if (trip.fuel) {
          // 기존 연료 비용이 있으면 업데이트
          trip.fuel.rate = value.fuel.rate;
          trip.fuel.mileage = value.fuel.mileage;
          trip.fuel.distance = value.fuel.distance;
          await queryRunner.manager.save(trip.fuel);
        } else {
          // 기존 연료 비용이 없으면 새로 생성
          const fuel = queryRunner.manager.create(TripFuelExpense, {
            trip: trip,
            rate: value.fuel.rate,
            mileage: value.fuel.mileage,
            distance: value.fuel.distance,
          });
          trip.fuel = await queryRunner.manager.save(fuel);
        }
      } else if (trip.fuel) {
        const fuelToDelete = trip.fuel;

        // 외래 키 제약 조건 해제: Trip 엔티티에서 참조 관계(fuel)를 먼저 제거하고 저장
        trip.fuel = null;
        await queryRunner.manager.save(trip);

        // 3. TripFuelExpense 엔티티를 안전하게 삭제
        await queryRunner.manager.remove(fuelToDelete);
      }

      trip.isDeducted = value.isDeducted;

      const saved = await queryRunner.manager.save(trip);

      const schedule = await this.scheduleService.getSchedule(trip.schedule.id);

      await queryRunner.commitTransaction();

      return plainToInstance(
        TripDto,
        {
          ...saved,
          schedule: schedule,
          user: user,
          rates: saved.rates.map((rate) => ({
            ...rate,
            stepId: rate.step?.id,
          })),
          expenses: saved.expenses.map((expense) => ({
            ...expense,
            stepId: expense.step?.id,
          })),
          fuel: saved.fuel,
          isDeducted: saved.isDeducted,
        },
        { excludeExtraneousValues: true },
      );
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async deleteTrip(id: number) {
    await this.tripRepository.softDelete(id);
  }
}

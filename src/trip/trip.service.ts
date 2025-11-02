import {
  ForbiddenException,
  Injectable,
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

  async exportTrip(id: number) {
    const trip = this.findTripById(id);

    if (!trip) {
      throw new NotFoundException('trip_not_found');
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

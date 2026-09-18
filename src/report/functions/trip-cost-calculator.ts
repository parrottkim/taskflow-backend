import { NotFoundException } from '@nestjs/common';
import dayjs from 'dayjs';
import { Report } from '@/entity/report/report.entity';
import { TripActualExpense } from '@/entity/report/trip/trip-actual-expense.entity';

export interface TripCostCalculation {
  totalCost: number;
  taxableAmount?: number;
  nonTaxableAmount?: number;
  exchangeRate?: number;
}

function convertAmountToKrw(amount: number, exchangeRate: number) {
  return Math.round(amount * exchangeRate);
}

function getExpenseAmountInKrw(expense: TripActualExpense) {
  return convertAmountToKrw(expense.price, expense.exchangeRate ?? 1);
}

function isExecutive(
  user: { rank?: { id: number } | null } | null | undefined,
) {
  return [1, 2].includes(user?.rank?.id ?? 0);
}

function isSameDayTrip(
  schedule: { start: Date | string; end: Date | string } | null | undefined,
) {
  return Boolean(
    schedule &&
    dayjs(schedule.start)
      .startOf('day')
      .isSame(dayjs(schedule.end).startOf('day')),
  );
}

export function calculateDomesticTripCosts(
  report: Report,
  traveler: { rank?: { id: number } | null } = report.createdBy,
): TripCostCalculation {
  const expenses = report.trip?.expenses ?? [];
  const rates = report.trip?.rates ?? [];
  const sumExpensesByStepIds = (stepIds: number[]) =>
    expenses
      .filter((expense) => stepIds.includes(expense.step.id))
      .reduce((sum, expense) => sum + getExpenseAmountInKrw(expense), 0);

  const transportationCost = sumExpensesByStepIds([1, 2, 3]);
  const localTransportCost = sumExpensesByStepIds([4, 5, 6]);
  const accommodationRate = [7, 8, 9].reduce((sum, stepId) => {
    const rate = rates.find((item) => item.step.id === stepId);
    return sum + (rate?.rate ?? 0) * (rate?.days ?? 0);
  }, 0);
  const accommodationCost = sumExpensesByStepIds([7, 8, 9]);
  const accommodationSettlement = accommodationRate - accommodationCost;

  const excludeDailyAllowance =
    isSameDayTrip(report.schedule) || isExecutive(traveler);
  const dailyRate = excludeDailyAllowance
    ? 0
    : rates
        .filter((rate) => rate.step.id === 10)
        .reduce((sum, rate) => sum + rate.rate * rate.days, 0);

  const personalFuel = report.trip?.fuel;
  const totalPersonalFuel =
    personalFuel?.mileage !== 0 && personalFuel?.mileage
      ? personalFuel.rate * (personalFuel.distance / personalFuel.mileage)
      : 0;
  const otherCost = sumExpensesByStepIds([12, 13]) + totalPersonalFuel;

  return {
    totalCost:
      transportationCost +
      localTransportCost +
      accommodationRate +
      dailyRate +
      otherCost,
    taxableAmount: accommodationSettlement,
    nonTaxableAmount: dailyRate + totalPersonalFuel,
  };
}

export function calculateOverseasTripCosts(
  report: Report,
): TripCostCalculation {
  const exchangeRate = report.trip?.exchangeRate?.rate;
  if (exchangeRate == null) {
    throw new NotFoundException('not_found_trip_exchange_rate');
  }

  const expenses = report.trip?.expenses ?? [];
  const rates = report.trip?.rates ?? [];
  const sumExpensesByStepIds = (stepIds: number[]) =>
    expenses
      .filter((expense) => stepIds.includes(expense.step.id))
      .reduce((sum, expense) => sum + getExpenseAmountInKrw(expense), 0);

  const transportationCost = sumExpensesByStepIds([14, 15, 16]);
  const localTransportCost = sumExpensesByStepIds([17, 18, 19]);
  const accommodation = sumExpensesByStepIds([20]);
  const dailyRate = [21, 22, 23].reduce((sum, stepId) => {
    const rate = rates.find((item) => item.step.id === stepId);
    return sum + (rate?.rate ?? 0) * (rate?.days ?? 0);
  }, 0);
  const deducted = report.trip?.isDeducted ? 0.1 : 0;
  const holidayRate = rates.find((rate) => rate.step.id === 24);
  const totalHolidayRate = (holidayRate?.rate ?? 0) * (holidayRate?.days ?? 0);
  const totalDailyRate = convertAmountToKrw(
    dailyRate * (1 - deducted) + totalHolidayRate,
    exchangeRate,
  );
  const otherCost = sumExpensesByStepIds([25, 26, 27, 28, 29]);

  return {
    totalCost:
      transportationCost +
      localTransportCost +
      accommodation +
      totalDailyRate +
      otherCost,
    exchangeRate,
  };
}

export function calculateTripCosts(report: Report): TripCostCalculation {
  return report.schedule.category.id === 1
    ? calculateDomesticTripCosts(report)
    : calculateOverseasTripCosts(report);
}

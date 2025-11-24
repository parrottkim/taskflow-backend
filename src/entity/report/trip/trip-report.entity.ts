// trip-report.entity.ts
import {
  Entity,
  OneToOne,
  JoinColumn,
  OneToMany,
  Column,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Report } from '../report.entity'; // Report 엔티티 경로
import { TripActualExpense } from './trip-actual-expense.entity';
import { TripRegulationRate } from './trip-regulation-rate.entity';
import { TripFuelExpense } from './trip-fuel-expense.entity';

@Entity()
export class TripReport {
  // TripReport의 PK는 Report 엔티티의 ID와 동일하게 설정하여 1:1 관계의 기준을 잡을 수도 있지만,
  // 여기서는 간단하게 별도의 PK를 사용하고 Report ID를 Foreign Key로 사용합니다.
  @PrimaryGeneratedColumn()
  id: number;

  // ⭐️ Report와의 OneToOne 관계 설정
  // Report 테이블의 PK를 Foreign Key로 사용하여 1:1 관계를 명확히 함
  @OneToOne(() => Report, (report) => report.trip)
  @JoinColumn()
  report: Report; // 부모 Report 엔티티 참조

  // 기존 출장 명령서 전용 필드들
  @OneToMany(() => TripActualExpense, (expense) => expense.trip, {
    // 관계를 TripReport로 변경
    cascade: true,
    orphanedRowAction: 'delete',
  })
  expenses: TripActualExpense[];

  @OneToMany(() => TripRegulationRate, (rate) => rate.trip, {
    // 관계를 TripReport로 변경
    cascade: true,
    orphanedRowAction: 'delete',
  })
  rates: TripRegulationRate[];

  @OneToOne(() => TripFuelExpense, (fuel) => fuel.trip)
  fuel?: TripFuelExpense;

  @Column()
  isDeducted?: boolean;
}

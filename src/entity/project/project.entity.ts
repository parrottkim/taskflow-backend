import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../user/user.entity';
import { Report } from '../report/report.entity';
import { ProjectClient } from './project-client.entity';
import { IssueCategory } from '../issue/issue-category.entity';
import { Bookmark } from '../bookmark/bookmark.entity';
import { Schedule } from '../schedule/schedule.entity';
import { Issue } from '../issue/issue.entity';
import { ContractIssue } from '../issue/contract/contract-issue.entity';
import { PaymentIssue } from '../issue/payment/payment-issue.entity';
import { ProcurementIssue } from '../issue/procurement/procurement-issue.entity';
import { TransactionIssue } from '../issue/transaction/transaction-issue.entity';
import { ApprovalIssue } from '../issue/approval/approval-issue.entity';
import { KickoffIssue } from '../issue/kickoff/kickoff-issue.entity';

@Entity()
export class Project {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', unique: true })
  code: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'bool', default: false })
  isPreexecuted: boolean;

  @Column({ type: 'bool', default: false })
  isContracted: boolean;

  @Column({ type: 'bool', default: false })
  isClosed: boolean;

  // 새로운 컬럼 추가
  @Column({ type: 'timestamp', nullable: true })
  preexecutedAt?: Date; // 사전절차 완료 시점

  @Column({ type: 'timestamp', nullable: true })
  contractedAt?: Date; // 계약 완료 시점

  @Column({ type: 'timestamp', nullable: true })
  closedAt?: Date; // 프로젝트 종료 시점

  @Column({ type: 'varchar', nullable: true })
  closureMessage: string;

  @Column({ type: 'int', default: 0 })
  views: number;

  @ManyToOne(() => User, (user) => user.createdProjects)
  createdBy: User;

  @ManyToOne(() => User, (user) => user.updatedProjects, { nullable: true })
  updatedBy?: User;

  @ManyToOne(() => User, { nullable: true })
  manager: User;

  @ManyToOne(() => ProjectClient, (client) => client.projects)
  client: ProjectClient;

  @ManyToOne(() => IssueCategory, { nullable: true })
  latestCategory?: IssueCategory;

  @OneToMany(() => Report, (report) => report.project, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  reports: Report[];

  @OneToMany(() => Schedule, (schedule) => schedule.project, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  schedules: Schedule[];

  @OneToMany(() => Bookmark, (bookmark) => bookmark.project)
  bookmarks: Bookmark[];

  @OneToMany(() => Issue, (issue) => issue.project, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  issues: Issue[];

  @OneToMany(() => KickoffIssue, (kickoff) => kickoff.project)
  kickoffs: KickoffIssue[];

  @OneToMany(() => ContractIssue, (contract) => contract.project)
  contracts: ContractIssue[];

  @OneToMany(() => TransactionIssue, (transaction) => transaction.project)
  transactions: TransactionIssue[];

  @OneToMany(() => PaymentIssue, (payment) => payment.project)
  payments: PaymentIssue[];

  @OneToMany(() => ApprovalIssue, (approval) => approval.project)
  approvals: ApprovalIssue[];

  @OneToMany(() => ProcurementIssue, (procurement) => procurement.project)
  procurements: ProcurementIssue[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt!: Date | null;
}

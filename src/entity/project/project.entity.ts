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
import { DeclarationIssue } from '../issue/declaration/declaration-issue.entity';
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

  @Column({ type: 'varchar', nullable: true })
  closureMessage: string;

  @Column({ type: 'int', default: 0 })
  views: number;

  @ManyToOne(() => User, (user) => user.projects)
  user: User;

  @ManyToOne(() => User, (user) => user.projects, { nullable: true })
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

  @OneToOne(() => KickoffIssue, (kickoff) => kickoff.project)
  kickoff: KickoffIssue;

  @OneToOne(() => ContractIssue, (contract) => contract.project)
  contract: ContractIssue;

  @OneToOne(() => TransactionIssue, (transaction) => transaction.project)
  transaction: TransactionIssue;

  @OneToOne(() => PaymentIssue, (payment) => payment.project)
  payment: PaymentIssue;

  @OneToMany(() => DeclarationIssue, (declaration) => declaration.project)
  declarations: DeclarationIssue[];

  @OneToMany(() => ProcurementIssue, (procurement) => procurement.project)
  procurements: ProcurementIssue[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt!: Date | null;
}

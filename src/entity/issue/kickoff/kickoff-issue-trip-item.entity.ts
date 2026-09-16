import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { KickoffIssueTripItemCategory } from './kickoff-issue-trip-item-category.entity';
import { KickoffIssue } from './kickoff-issue.entity';

@Entity()
export class KickoffIssueTripItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => KickoffIssueTripItemCategory, (category) => category.items)
  category: KickoffIssueTripItemCategory;

  @ManyToOne(() => KickoffIssue, (kickoff) => kickoff.tripItems)
  kickoff: KickoffIssue;

  @Column()
  days: number;

  @Column({ nullable: true })
  note: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}

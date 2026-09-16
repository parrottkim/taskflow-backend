import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { KickoffIssue } from './kickoff-issue.entity';
import { User } from '@/entity/user/user.entity';

@Entity()
export class KickoffIssueParticipantItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => KickoffIssue, (kickoff) => kickoff.participantItems)
  kickoff: KickoffIssue;

  @ManyToOne(() => User)
  @JoinColumn()
  participant: User;

  @Column()
  role: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}

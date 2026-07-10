import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Issue } from './issue.entity';

@Entity()
export class IssueAttachment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Issue, (issue) => issue.attachments, {
    onDelete: 'CASCADE',
  })
  issue: Issue;

  @Column({ type: 'varchar' })
  filename: string;

  @Column()
  size: number;

  @Column({ type: 'varchar' })
  path: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Issue } from './issue.entity';

@Entity()
export class IssueAttachment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Issue, (issue) => issue.attachments, { onDelete: 'CASCADE' })
  issue: Issue;

  @Column({ type: 'varchar' })
  name: string;

  @Column()
  size: number;

  @Column({ type: 'varchar' })
  url: string;

  @CreateDateColumn()
  createdAt: Date;
}

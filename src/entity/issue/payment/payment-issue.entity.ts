import { Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Issue } from '../issue.entity';

@Entity()
export class PaymentIssue {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Issue, (issue) => issue.payment)
  @JoinColumn()
  issue: Issue;
}

import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { TripStep } from './trip-step.entity';

@Entity()
export class TripCategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @OneToMany(() => TripStep, (step) => step.category)
  steps: TripStep[];
}

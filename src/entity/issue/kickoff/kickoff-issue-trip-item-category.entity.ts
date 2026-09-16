import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { KickoffIssueTripItem } from './kickoff-issue-trip-item.entity';

@Entity()
export class KickoffIssueTripItemCategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  name: string;

  @OneToMany(() => KickoffIssueTripItem, (item) => item.category)
  items: KickoffIssueTripItem[];
}

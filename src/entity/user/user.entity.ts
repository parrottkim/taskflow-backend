import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserPosition } from './user-position.entity';
import { UserDepartment } from './user-department.entity';
import { Project } from '../project/project.entity';
import { Exclude } from 'class-transformer';
import { Issue } from '../issue/issue.entity';
import { Bookmark } from '../bookmark/bookmark.entity';
import { Schedule } from '../schedule/schedule.entity';
import { Trip } from '../trip/trip.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, type: 'varchar' })
  email: string;

  @Column({ type: 'varchar' })
  username: string;

  @Column({ type: 'bytea', nullable: true })
  profile?: Buffer;

  @Column({ type: 'varchar' })
  password: string;

  @Column({ type: 'bool', default: false })
  isAdmin: boolean;

  @Column({ type: 'bool', default: false })
  isAuthorized: boolean;

  @Column({ type: 'varchar', nullable: true })
  refreshToken: string;

  @ManyToOne(() => UserPosition, (position) => position.users)
  position: UserPosition;

  @ManyToOne(() => UserDepartment, (department) => department.users)
  department: UserDepartment;

  @OneToMany(() => Project, (project) => project.user)
  projects: Project[];

  @OneToMany(() => Issue, (issue) => issue.user)
  issues: Issue[];

  @OneToMany(() => Bookmark, (bookmark) => bookmark.user)
  bookmarks: Bookmark[];

  @OneToMany(() => Schedule, (schedule) => schedule.user)
  schedules: Schedule[];

  @OneToMany(() => Trip, (trip) => trip.user)
  trips: Trip[];
}

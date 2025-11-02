import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../user/user.entity';
import { ProjectClient } from './project-client.entity';
import { Issue } from '../issue/issue.entity';
import { IssueCategory } from '../issue/issue-category.entity';
import { Bookmark } from '../bookmark/bookmark.entity';
import { Schedule } from '../schedule/schedule.entity';

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

  @OneToMany(() => Issue, (issue) => issue.project, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  issues: Issue[];

  @OneToMany(() => Schedule, (schedule) => schedule.project)
  schedules: Schedule[];

  @OneToMany(() => Bookmark, (bookmark) => bookmark.project)
  bookmarks: Bookmark[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt!: Date | null;
}

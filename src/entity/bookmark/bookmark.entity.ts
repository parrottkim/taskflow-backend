import {
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Project } from '../project/project.entity';
import { User } from '../user/user.entity';

@Entity()
@Unique(['user', 'project'])
export class Bookmark {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.bookmarks)
  user: User;

  @ManyToOne(() => Project, (project) => project.bookmarks)
  project: Project;

  @CreateDateColumn()
  createdAt: Date;
}

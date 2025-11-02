import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';
import { UserDepartmentClosure } from './user-department-closure.entity';

@Entity()
export class UserDepartment {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToMany(() => User, (user) => user.department)
  users: User[];

  @Column({ type: 'varchar' })
  name: string;

  @OneToMany(() => UserDepartmentClosure, (closure) => closure.ancestorClient)
  ancestorClosures: UserDepartmentClosure[];

  @OneToMany(() => UserDepartmentClosure, (closure) => closure.descendantClient)
  descendantClosures: UserDepartmentClosure[];
}

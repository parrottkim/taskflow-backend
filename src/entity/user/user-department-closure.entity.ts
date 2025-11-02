import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { UserDepartment } from './user-department.entity';

@Entity()
export class UserDepartmentClosure {
  @PrimaryColumn()
  ancestor: number;

  @PrimaryColumn()
  descendant: number;

  @Column()
  depth: number;

  @ManyToOne(() => UserDepartment, (department) => department.ancestorClosures)
  @JoinColumn({ name: 'ancestor' })
  ancestorClient: UserDepartment;

  @ManyToOne(
    () => UserDepartment,
    (department) => department.descendantClosures,
  )
  @JoinColumn({ name: 'descendant' })
  descendantClient: UserDepartment;
}

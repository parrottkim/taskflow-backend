import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Project } from './project.entity';
import { ProjectClientClosure } from './project-client-closure.entity';

@Entity()
export class ProjectClient {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  name: string;

  @OneToMany(() => ProjectClientClosure, (closure) => closure.ancestorClient)
  ancestorClosures: ProjectClientClosure[];

  @OneToMany(() => ProjectClientClosure, (closure) => closure.descendantClient)
  descendantClosures: ProjectClientClosure[];

  @OneToMany(() => Project, (project) => project.client)
  projects: Project[];
}

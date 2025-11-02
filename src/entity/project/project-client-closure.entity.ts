import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { ProjectClient } from './project-client.entity';

@Entity()
export class ProjectClientClosure {
  @PrimaryColumn()
  ancestor: number;

  @PrimaryColumn()
  descendant: number;

  @Column()
  depth: number;

  @ManyToOne(() => ProjectClient, (client) => client.ancestorClosures)
  @JoinColumn({ name: 'ancestor' })
  ancestorClient: ProjectClient;

  @ManyToOne(() => ProjectClient, (client) => client.descendantClosures)
  @JoinColumn({ name: 'descendant' })
  descendantClient: ProjectClient;
}

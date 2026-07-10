import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { DocumentFolder } from './document-folder.entity';

@Entity()
export class DocumentFolderClosure {
  @PrimaryColumn()
  ancestor: number;

  @PrimaryColumn()
  descendant: number;

  @Column()
  depth: number;

  @ManyToOne(() => DocumentFolder, (client) => client.ancestorClosures, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'ancestor' })
  ancestorFolder: DocumentFolder;

  @ManyToOne(() => DocumentFolder, (client) => client.descendantClosures, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'descendant' })
  descendantFolder: DocumentFolder;
}

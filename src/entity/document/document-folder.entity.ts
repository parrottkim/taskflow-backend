import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Document } from './document.entity';
import { DocumentFolderClosure } from './document-folder-closure.entity';

@Entity()
export class DocumentFolder {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ default: false })
  fixed: boolean;

  @Column({ type: 'int', default: 0 })
  sort: number;

  @OneToMany(() => DocumentFolderClosure, (closure) => closure.ancestorFolder)
  ancestorClosures: DocumentFolderClosure[];

  @OneToMany(() => DocumentFolderClosure, (closure) => closure.descendantFolder)
  descendantClosures: DocumentFolderClosure[];

  @OneToMany(() => Document, (document) => document.folder)
  documents: Document[];
}

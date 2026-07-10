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
import { DocumentAttachment } from './document-attachment.entity';
import { DocumentFolder } from './document-folder.entity';
import { User } from '../user/user.entity';

@Entity()
export class Document {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => DocumentFolder, (folder) => folder.documents, {
    onDelete: 'CASCADE',
  })
  folder: DocumentFolder;

  @ManyToOne(() => User, (user) => user.createdIssues)
  createdBy: User;

  @ManyToOne(() => User, (user) => user.updatedIssues, { nullable: true })
  updatedBy?: User;

  @OneToMany(() => DocumentAttachment, (attachment) => attachment.document, {
    cascade: true,
    orphanedRowAction: 'delete',
  })
  attachments: DocumentAttachment[];

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ default: false })
  fixed: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt!: Date | null;
}

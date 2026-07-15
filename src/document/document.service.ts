import { Document } from '@/entity/document/document.entity';
import { DocumentFolder } from '@/entity/document/document-folder.entity';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { GetDocumentsDto } from './dto/get-documents';
import { DocumentDto, DocumentListDto } from './dto/document';
import { plainToInstance } from 'class-transformer';
import { User } from '@/entity/user/user.entity';
import { assertWriteAccess } from '@/common/policies/write-access.policy';
import { assertOwnerOrAdmin } from '@/common/policies/resource-access.policy';
import { CreateDocumentDto } from './dto/create-document';
import { UpdateDocumentDto } from './dto/update-document';
import { MailService } from '@/mail/mail.service';

@Injectable()
export class DocumentService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @InjectRepository(DocumentFolder)
    private readonly documentFolderRepository: Repository<DocumentFolder>,
    private readonly mailService: MailService,
  ) {}

  private async ensureFixedDocumentLimit(
    manager: EntityManager,
    folderId: number,
    excludeDocumentId?: number,
  ) {
    const queryBuilder = manager
      .getRepository(Document)
      .createQueryBuilder('document')
      .leftJoin('document.folder', 'folder')
      .where('folder.id = :folderId', { folderId })
      .andWhere('document.fixed = true');

    if (excludeDocumentId) {
      queryBuilder.andWhere('document.id != :excludeDocumentId', {
        excludeDocumentId,
      });
    }

    const fixedCount = await queryBuilder.getCount();

    if (fixedCount >= 5) {
      throw new ConflictException('fixed_document_limit_exceeded');
    }
  }

  async findDocumentById(id: number) {
    return this.documentRepository
      .createQueryBuilder('document')
      .leftJoinAndSelect('document.folder', 'folder')
      .leftJoinAndSelect('document.createdBy', 'createdBy')
      .leftJoinAndSelect('document.updatedBy', 'updatedBy')
      .leftJoinAndSelect('document.attachments', 'attachment')
      .where('document.id = :id', { id })
      .addOrderBy('attachment.createdAt', 'DESC')
      .getOne();
  }

  async findDocuments(value: GetDocumentsDto) {
    const queryBuilder = this.documentRepository
      .createQueryBuilder('document')
      .leftJoinAndSelect('document.folder', 'folder')
      .leftJoinAndSelect('document.createdBy', 'createdBy')
      .loadRelationCountAndMap(
        'document.attachmentCount',
        'document.attachments',
      )
      .andWhere('document.fixed = false');

    if (value.search) {
      queryBuilder.andWhere('document.title ILIKE :search', {
        search: `%${value.search}%`,
      });
    } else {
      queryBuilder.andWhere('folder.id = :id', { id: value.folderId });
    }

    const orderType = value.order?.toUpperCase() as 'ASC' | 'DESC';

    switch (value.sort) {
      case 'title':
        queryBuilder.orderBy('document.title', orderType || 'ASC');
        break;
      case 'recent':
        queryBuilder.orderBy('document.createdAt', orderType || 'DESC');
        break;
      default:
        queryBuilder.orderBy('document.createdAt', 'DESC');
        break;
    }

    queryBuilder.addOrderBy('document.id', 'ASC');

    const [normalDocuments, normalTotal] = await queryBuilder
      .skip((value.page - 1) * value.limit)
      .take(value.limit)
      .getManyAndCount();

    if (value.page > 1) {
      return {
        documents: normalDocuments,
        total: normalTotal,
      };
    }

    const fixedQueryBuilder = this.documentRepository
      .createQueryBuilder('document')
      .leftJoinAndSelect('document.folder', 'folder')
      .leftJoinAndSelect('document.createdBy', 'createdBy')
      .loadRelationCountAndMap(
        'document.attachmentCount',
        'document.attachments',
      )
      .andWhere('document.fixed = true');

    if (value.search) {
      fixedQueryBuilder.andWhere('document.title ILIKE :search', {
        search: `%${value.search}%`,
      });
    } else {
      fixedQueryBuilder.andWhere('folder.id = :id', { id: value.folderId });
    }

    switch (value.sort) {
      case 'title':
        fixedQueryBuilder.orderBy('document.title', orderType || 'ASC');
        break;
      case 'recent':
        fixedQueryBuilder.orderBy('document.createdAt', orderType || 'DESC');
        break;
      default:
        fixedQueryBuilder.orderBy('document.createdAt', 'DESC');
        break;
    }

    fixedQueryBuilder.addOrderBy('document.id', 'ASC');

    const fixedDocuments = await fixedQueryBuilder.getMany();

    return {
      documents: [...fixedDocuments, ...normalDocuments],
      total: normalTotal,
    };
  }

  async getDocument(id: number) {
    const document = await this.findDocumentById(id);

    if (!document) {
      throw new NotFoundException('document_not_found');
    }

    const documentDto = plainToInstance(DocumentDto, document, {
      excludeExtraneousValues: true,
    });

    return documentDto;
  }

  async getDocumentDetail(id: number) {
    const incrementResult = await this.documentRepository
      .createQueryBuilder()
      .update(Document)
      .set({
        views: () => '"views" + 1',
        updatedAt: () => '"updated_at"',
      })
      .where('"id" = :id', { id })
      .andWhere('"deleted_at" IS NULL')
      .execute();

    if (!incrementResult.affected) {
      throw new NotFoundException('document_not_found');
    }

    const document = await this.findDocumentById(id);

    if (!document) {
      throw new NotFoundException('document_not_found');
    }

    return plainToInstance(DocumentDto, document, {
      excludeExtraneousValues: true,
    });
  }

  async getDocuments(query: GetDocumentsDto) {
    const { documents, total } = await this.findDocuments(query);

    const documentListDto = plainToInstance(
      DocumentListDto,
      {
        items: documents,
        page: query.page,
        total: total,
      },
      {
        excludeExtraneousValues: true,
      },
    );

    return documentListDto;
  }

  async sendMail(user: User, id: number, userIds?: number[]) {
    assertWriteAccess(user);
    const document = await this.findDocumentById(id);

    if (!document) {
      throw new NotFoundException('document_not_found');
    }

    const documentDto = plainToInstance(DocumentDto, document, {
      excludeExtraneousValues: true,
    });

    await this.mailService.sendDocumentMail(
      documentDto,
      document.folder.name,
      userIds,
    );
  }

  async createDocument(user: User, body: CreateDocumentDto) {
    assertWriteAccess(user);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const folder = await queryRunner.manager.findOne(DocumentFolder, {
        where: { id: body.folderId },
      });

      if (!folder) {
        throw new NotFoundException('folder_not_found');
      }

      if (body.fixed) {
        await this.ensureFixedDocumentLimit(queryRunner.manager, folder.id);
      }

      const document = queryRunner.manager.create(Document, {
        title: body.title,
        content: body.content,
        fixed: body.fixed ?? false,
        folder,
        createdBy: user,
      });

      const saved = await queryRunner.manager.save(document);
      await queryRunner.commitTransaction();

      const created = await this.findDocumentById(saved.id);

      return plainToInstance(DocumentDto, created, {
        excludeExtraneousValues: true,
      });
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async updateDocument(user: User, id: number, body: UpdateDocumentDto) {
    assertWriteAccess(user);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const document = await queryRunner.manager.findOne(Document, {
        where: { id },
        relations: ['createdBy', 'folder'],
      });

      if (!document) {
        throw new NotFoundException('document_not_found');
      }

      assertOwnerOrAdmin(user, document.createdBy.id);

      const originalFolderId = document.folder.id;

      if (body.folderId && body.folderId !== document.folder.id) {
        const folder = await queryRunner.manager.findOne(DocumentFolder, {
          where: { id: body.folderId },
        });

        if (!folder) {
          throw new NotFoundException('folder_not_found');
        }

        document.folder = folder;
      }

      const targetFolderId = document.folder.id;
      const willBeFixed = body.fixed ?? document.fixed;

      if (
        willBeFixed &&
        (!document.fixed || targetFolderId !== originalFolderId)
      ) {
        await this.ensureFixedDocumentLimit(
          queryRunner.manager,
          targetFolderId,
          document.id,
        );
      }

      document.title = body.title ?? document.title;
      document.content = body.content ?? document.content;
      document.fixed = body.fixed ?? document.fixed;
      document.updatedBy = user;

      const saved = await queryRunner.manager.save(document);
      await queryRunner.commitTransaction();

      const updated = await this.findDocumentById(saved.id);

      return plainToInstance(DocumentDto, updated, {
        excludeExtraneousValues: true,
      });
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async deleteDocument(user: User, id: number) {
    assertWriteAccess(user);
    const document = await this.documentRepository.findOne({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException('document_not_found');
    }

    await this.documentRepository.softDelete(id);

    return true;
  }
}

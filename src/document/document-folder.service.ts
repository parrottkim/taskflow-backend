import { DocumentFolderClosure } from '@/entity/document/document-folder-closure.entity';
import { DocumentFolder } from '@/entity/document/document-folder.entity';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { DocumentFolderDto } from './dto/document-folder';
import { plainToInstance } from 'class-transformer';
import { CreateFolderDto } from './dto/create-folder';
import { UpdateFolderDto } from './dto/update-folder';
import {
  SyncDocumentFolderDto,
  SyncDocumentFoldersDto,
} from './dto/sync-folders';
import { User } from '@/entity/user/user.entity';
import { assertWriteAccess } from '@/common/policies/write-access.policy';

type FlattenedFolderInput = {
  id: number;
  parentId: number | null;
  name: string;
  sort: number;
  fixed: boolean;
};

@Injectable()
export class DocumentFolderService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(DocumentFolder)
    private folderRepository: Repository<DocumentFolder>,

    @InjectRepository(DocumentFolderClosure)
    private folderClosureRepository: Repository<DocumentFolderClosure>,
  ) {}

  async findRootFolders() {
    return await this.folderRepository
      .createQueryBuilder('folder')
      .leftJoin(
        DocumentFolderClosure,
        'closure',
        'folder.id = closure.descendant AND folder.id != closure.ancestor',
      )
      .where('closure.ancestor IS NULL')
      .getMany();
  }

  async findAllFolders() {
    const roots = await this.findRootFolders();
    const rootIds = roots.map((r) => r.id);

    if (!rootIds.length) return [];

    const maxDepthResult = await this.folderRepository
      .createQueryBuilder('folder')
      .select('MAX(closure.depth)', 'maxDepth')
      .innerJoin(
        DocumentFolderClosure,
        'closure',
        'folder.id = closure.descendant',
      )
      .where('closure.ancestor IN (:...rootIds)', { rootIds })
      .getRawOne();

    const maxDepth = maxDepthResult?.maxDepth || 0;

    return await this.folderRepository
      .createQueryBuilder('folder')
      .select('folder.id', 'id')
      .addSelect('folder.name', 'name')
      .addSelect('folder.fixed', 'fixed')
      .addSelect('folder.sort', 'sort')
      .addSelect('MIN(closure.depth)', 'depth')
      .addSelect('parent.ancestor', 'parentId')
      .innerJoin(
        DocumentFolderClosure,
        'closure',
        'folder.id = closure.descendant',
      )
      .leftJoin(
        DocumentFolderClosure,
        'parent',
        'parent.descendant = folder.id AND parent.depth = 1',
      )
      .where('closure.ancestor IN (:...rootIds)', { rootIds })
      .groupBy('folder.id')
      .addGroupBy('parent.ancestor')
      .orderBy('depth', 'ASC')
      .addOrderBy('parent.ancestor', 'ASC')
      .addOrderBy('folder.sort', 'ASC')
      .addOrderBy(
        `CASE WHEN MIN(closure.depth) = ${maxDepth} THEN folder.name END`,
        'ASC',
      )
      .addOrderBy('folder.id', 'ASC')
      .getRawMany();
  }

  async getAllFolders() {
    const folders = await this.findAllFolders();

    const folderMap = new Map<number, DocumentFolderDto>();
    const roots: DocumentFolderDto[] = [];

    for (const folder of folders) {
      const parentId = folder.parentId ? parseInt(folder.parentId, 10) : null;

      const dto = plainToInstance(
        DocumentFolderDto,
        {
          ...folder,
          parentId,
          sort: parseInt(folder.sort, 10),
          children: [],
        },
        {
          excludeExtraneousValues: true,
        },
      );

      folderMap.set(dto.id, dto);
    }

    for (const folder of folderMap.values()) {
      if (!folder.parentId) {
        roots.push(folder);
        continue;
      }

      const parent = folderMap.get(folder.parentId);

      if (parent) {
        parent.children.push(folder);
      }
    }

    const sortFolders = (items: DocumentFolderDto[]) => {
      items.sort((a, b) => {
        if (a.sort !== b.sort) return a.sort - b.sort;
        return a.name.localeCompare(b.name);
      });

      for (const item of items) {
        sortFolders(item.children);
      }
    };

    sortFolders(roots);

    return roots;
  }

  private flattenFolderInputs(
    folders: SyncDocumentFolderDto[],
    parentId: number | null = null,
    result: FlattenedFolderInput[] = [],
  ) {
    folders.forEach((folder, index) => {
      result.push({
        id: folder.id,
        parentId,
        name: folder.name,
        sort: folder.sort ?? index,
        fixed: folder.fixed,
      });

      this.flattenFolderInputs(folder.children || [], folder.id, result);
    });

    return result;
  }

  private async rebuildClosures(
    manager: EntityManager,
    parentByFolderId: Map<number, number | null>,
  ) {
    await manager
      .createQueryBuilder()
      .delete()
      .from(DocumentFolderClosure)
      .execute();

    const closures: DocumentFolderClosure[] = [];

    for (const folderId of parentByFolderId.keys()) {
      closures.push(
        manager.create(DocumentFolderClosure, {
          ancestor: folderId,
          descendant: folderId,
          depth: 0,
        }),
      );

      let depth = 1;
      let parentId = parentByFolderId.get(folderId) ?? null;

      while (parentId) {
        closures.push(
          manager.create(DocumentFolderClosure, {
            ancestor: parentId,
            descendant: folderId,
            depth,
          }),
        );

        parentId = parentByFolderId.get(parentId) ?? null;
        depth += 1;
      }
    }

    if (closures.length) {
      await manager.save(DocumentFolderClosure, closures);
    }
  }

  private async findParentId(manager: EntityManager, folderId: number) {
    const parent = await manager.findOne(DocumentFolderClosure, {
      where: {
        descendant: folderId,
        depth: 1,
      },
    });

    return parent?.ancestor ?? null;
  }

  private collectPositiveFolderIds(
    folders: SyncDocumentFolderDto[],
    result: number[] = [],
  ) {
    for (const folder of folders) {
      if (folder.id != null && folder.id > 0) {
        result.push(folder.id);
      }

      this.collectPositiveFolderIds(folder.children ?? [], result);
    }

    return result;
  }

  async sync(user: User, body: SyncDocumentFoldersDto) {
    assertWriteAccess(user);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const positiveInputIds = this.collectPositiveFolderIds(body.items);

      if (new Set(positiveInputIds).size !== positiveInputIds.length) {
        throw new BadRequestException('bad_request_folder_id_duplicate');
      }

      const existingFolders = await queryRunner.manager.find(DocumentFolder);
      const existingById = new Map(
        existingFolders.map((folder) => [folder.id, folder]),
      );

      const keptPositiveIds = new Set<number>();
      const parentByFolderId = new Map<number, number | null>();

      const upsertFolder = async (
        input: SyncDocumentFolderDto,
        parentId: number | null,
      ): Promise<void> => {
        let folder: DocumentFolder;

        if (input.id != null && input.id > 0) {
          const existing = existingById.get(input.id);

          if (!existing) {
            throw new NotFoundException('not_found_folder');
          }

          folder = existing;
          keptPositiveIds.add(folder.id);

          if (!folder.fixed) {
            folder.name = input.name;
            folder.sort = input.sort ?? 0;
          }

          await queryRunner.manager.save(folder);
        } else {
          folder = queryRunner.manager.create(DocumentFolder, {
            name: input.name,
            fixed: false,
            sort: input.sort ?? 0,
          });

          folder = await queryRunner.manager.save(folder);
        }

        const previousParentId = await this.findParentId(
          queryRunner.manager,
          folder.id,
        );

        if (folder.fixed && previousParentId !== parentId) {
          throw new ForbiddenException(
            'forbidden_fixed_folder_move_not_allowed',
          );
        }

        parentByFolderId.set(folder.id, parentId);

        for (const child of input.children ?? []) {
          await upsertFolder(child, folder.id);
        }
      };

      for (const item of body.items) {
        await upsertFolder(item, null);
      }

      const deletableIds = existingFolders
        .filter((folder) => !folder.fixed && !keptPositiveIds.has(folder.id))
        .map((folder) => folder.id);

      if (deletableIds.length) {
        await queryRunner.manager.delete(DocumentFolder, {
          id: In(deletableIds),
        });
      }

      await this.rebuildClosures(queryRunner.manager, parentByFolderId);

      await queryRunner.commitTransaction();

      return this.getAllFolders();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async create(user: User, body: CreateFolderDto) {
    assertWriteAccess(user);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const folder = queryRunner.manager.create(DocumentFolder, {
        name: body.name,
        fixed: body.fixed,
      });
      const savedFolder = await queryRunner.manager.save(folder);

      if (body.parentId) {
        const parentClosures = await queryRunner.manager.find(
          DocumentFolderClosure,
          {
            where: { descendant: body.parentId },
          },
        );

        if (!parentClosures.length) {
          throw new NotFoundException('not_found_parent_folder');
        }

        const newClosures = parentClosures.map((parentClosure) =>
          queryRunner.manager.create(DocumentFolderClosure, {
            ancestor: parentClosure.ancestor,
            descendant: savedFolder.id,
            depth: parentClosure.depth + 1,
          }),
        );

        newClosures.push(
          queryRunner.manager.create(DocumentFolderClosure, {
            ancestor: savedFolder.id,
            descendant: savedFolder.id,
            depth: 0,
          }),
        );

        await queryRunner.manager.save(newClosures);
      } else {
        const closure = queryRunner.manager.create(DocumentFolderClosure, {
          ancestor: savedFolder.id,
          descendant: savedFolder.id,
          depth: 0,
        });

        await queryRunner.manager.save(closure);
      }

      await queryRunner.commitTransaction();

      return savedFolder;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async update(user: User, id: number, body: UpdateFolderDto) {
    assertWriteAccess(user);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}

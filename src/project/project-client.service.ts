import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { ProjectClientClosure } from '@/entity/project/project-client-closure.entity';
import { ProjectClient } from '@/entity/project/project-client.entity';
import { DataSource, Repository } from 'typeorm';
import { AllClientCountDto } from './dto/all-client-count';
import { ProjectClientDto, ProjectClientGroupDto } from './dto/project-client';
import { CreateProjectClientDto } from './dto/create-project-client';
import { User } from '@/entity/user/user.entity';
import { assertWriteAccess } from '@/common/policies/write-access.policy';

@Injectable()
export class ProjectClientService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ProjectClient)
    private clientRepository: Repository<ProjectClient>,

    @InjectRepository(ProjectClientClosure)
    private clientClosureRepository: Repository<ProjectClientClosure>,
  ) {}

  // 새로운 고객 생성
  async create(
    user: User,
    body: CreateProjectClientDto,
  ): Promise<ProjectClient> {
    assertWriteAccess(user);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const client = queryRunner.manager.create(ProjectClient, {
        name: body.name,
      });
      const savedClient = await queryRunner.manager.save(client);

      if (body.parentId) {
        // 부모가 있는 경우: 부모의 Closure Table 레코드를 가져와서 새로운 레코드를 추가
        const parentClosures = await queryRunner.manager.find(
          ProjectClientClosure,
          {
            where: { descendant: body.parentId },
          },
        );

        if (!parentClosures.length) {
          throw new NotFoundException('parent_client_not_found');
        }

        const newClosures = parentClosures.map((parentClosure) =>
          queryRunner.manager.create(ProjectClientClosure, {
            ancestor: parentClosure.ancestor,
            descendant: savedClient.id,
            depth: parentClosure.depth + 1,
          }),
        );

        newClosures.push(
          queryRunner.manager.create(ProjectClientClosure, {
            ancestor: savedClient.id,
            descendant: savedClient.id,
            depth: 0,
          }),
        );

        await queryRunner.manager.save(newClosures);
      } else {
        // 루트 노드의 경우: 자기 자신과의 관계를 Closure Table에 추가
        const closure = queryRunner.manager.create(ProjectClientClosure, {
          ancestor: savedClient.id,
          descendant: savedClient.id,
          depth: 0,
        });

        await queryRunner.manager.save(closure);
      }

      await queryRunner.commitTransaction();

      return savedClient;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findClientById(id: number) {
    return await this.clientRepository
      .createQueryBuilder('client')
      .where('client.id = :id', { id })
      .getOne();
  }

  async findRootClients() {
    return await this.clientRepository
      .createQueryBuilder('client')
      .leftJoin(
        ProjectClientClosure,
        'closure',
        'client.id = closure.descendant AND client.id != closure.ancestor', // 중요: 자기 자신과의 관계는 제외
      )
      .where('closure.ancestor IS NULL') // 조인된 closure 레코드가 없으면 루트 노드
      .getMany();
  }

  async findAllClients() {
    const roots = await this.findRootClients();
    const rootIds = roots.map((r) => r.id);

    if (!rootIds.length) return [];

    // 1. 모든 클라이언트의 최대 깊이를 찾습니다.
    const maxDepthResult = await this.clientRepository
      .createQueryBuilder('client')
      .select('MAX(closure.depth)', 'maxDepth')
      .innerJoin(
        ProjectClientClosure,
        'closure',
        'client.id = closure.descendant',
      )
      .where('closure.ancestor IN (:...rootIds)', { rootIds })
      .getRawOne();

    const maxDepth = maxDepthResult?.maxDepth || 0; // 최대 깊이

    return await this.clientRepository
      .createQueryBuilder('client')
      .select('client.id', 'id')
      .addSelect('client.name', 'name')
      .addSelect('MIN(closure.depth)', 'depth')
      .addSelect('parent.ancestor', 'parentId')
      .innerJoin(
        ProjectClientClosure,
        'closure',
        'client.id = closure.descendant',
      )
      .leftJoin(
        ProjectClientClosure,
        'parent',
        'parent.descendant = client.id AND parent.depth = 1',
      )
      .where('closure.ancestor IN (:...rootIds)', { rootIds })
      .groupBy('client.id')
      .addGroupBy('parent.ancestor')
      // 2. 깊이(depth)를 기준으로 정렬합니다. (가장 얕은 것부터)
      .orderBy('depth', 'ASC')
      .addOrderBy('parent.ancestor', 'ASC')
      // 3. 가장 깊은 depth (최종 자손)인 경우 name으로 정렬합니다.
      //    (최대 깊이 maxDepth와 같을 때 name으로 정렬, 아닐 때는 id로 정렬)
      .addOrderBy(
        `CASE WHEN MIN(closure.depth) = ${maxDepth} THEN client.name END`,
        'ASC',
      )
      // 4. 나머지 경우에는 id로 정렬합니다. (혹은 최대 깊이가 아닌 경우 id로 정렬)
      .addOrderBy('client.id', 'ASC')
      .getRawMany();
  }

  async findAllClientCount() {
    const rootNodes = await this.findRootClients();
    const rootIds = rootNodes.map((node) => node.id);

    return await this.clientRepository
      .createQueryBuilder('client')
      .select('closure.depth', 'depth')
      .addSelect('COUNT(client.id)', 'count')
      .innerJoin(
        ProjectClientClosure,
        'closure',
        'client.id = closure.descendant',
      )
      .where('closure.ancestor IN (:...rootIds)', { rootIds })
      .groupBy('closure.depth')
      .getRawMany();
  }

  async findDescendants(clientId: number) {
    const descendants = await this.clientClosureRepository
      .createQueryBuilder('closure')
      .innerJoinAndSelect('closure.descendantClient', 'descendant')
      .where('closure.ancestor = :clientId', { clientId })
      // .andWhere('closure.depth = :depth', { depth: 1 })
      .getMany();

    return descendants.map((d) => d.descendantClient);
  }

  // 특정 고객의 모든 상위 고객 조회
  async findAncestors(clientId: number) {
    const ancestors = await this.clientClosureRepository
      .createQueryBuilder('closure')
      .innerJoinAndSelect('closure.ancestorClient', 'ancestor')
      .where('closure.descendant = :clientId', { clientId })
      .andWhere('closure.depth >= 0') // 1단계 이상의 모든 상위 고객을 찾기 위해 depth 조건 제거
      .getMany();

    return ancestors.map((a) => a.ancestorClient);
  }

  async findAllAncestors(clientIds: number[]) {
    if (!clientIds || clientIds.length === 0) {
      return [];
    }

    // 1. 한 번의 쿼리로 모든 관련 closure 레코드와 상위 고객 엔티티를 가져옵니다.
    const closures = await this.clientClosureRepository
      .createQueryBuilder('closure')
      .innerJoinAndSelect('closure.ancestorClient', 'ancestor')
      .where('closure.descendant IN (:...clientIds)', { clientIds })
      .orderBy('closure.descendant', 'ASC') // 그룹핑을 위해 descendantId로 정렬
      .addOrderBy('closure.depth', 'DESC') // 상위 부모부터 순서를 맞추기 위해 depth 내림차순 정렬
      .getMany();

    // 2. 결과를 descendantId 기준으로 그룹핑합니다.
    const groupedByDescendant = new Map<number, ProjectClient[]>();

    for (const closure of closures) {
      // closure 엔티티에 descendant 필드가 ID를 직접 가지고 있다고 가정
      const descendantId = closure.descendant as any as number;
      const ancestor = closure.ancestorClient;

      if (!groupedByDescendant.has(descendantId)) {
        groupedByDescendant.set(descendantId, []);
      }
      groupedByDescendant.get(descendantId)!.push(ancestor);
    }

    // 3. ProjectService에서 사용하기 좋은 형태로 변환하여 반환합니다.
    return Array.from(groupedByDescendant.entries()).map(
      ([descendantId, ancestors]) => ({
        descendantId,
        ancestors,
      }),
    );
  }

  async getAllClients() {
    const clients = await this.findAllClients();

    const groupMap = new Map<string, ProjectClientDto[]>();

    for (const client of clients) {
      const depth = parseInt(client.depth, 10);
      const parentId = client.parentId ? parseInt(client.parentId, 10) : null;
      const key = `${depth}|${parentId}`;

      if (!groupMap.has(key)) {
        groupMap.set(key, []);
      }

      const dto = plainToInstance(ProjectClientDto, client, {
        excludeExtraneousValues: true,
      });

      groupMap.get(key)!.push(dto);
    }

    return Array.from(groupMap.entries())
      .sort((a, b) => {
        const [depthA, parentA] = a[0]
          .split('|')
          .map((x) => (x === 'null' ? null : parseInt(x, 10)));
        const [depthB, parentB] = b[0]
          .split('|')
          .map((x) => (x === 'null' ? null : parseInt(x, 10)));

        if (depthA! !== depthB!) return depthA! - depthB!;
        if (parentA === null) return -1;
        if (parentB === null) return 1;
        return parentA - parentB;
      })
      .map(([key, items]) => {
        const [depthStr, parentStr] = key.split('|');
        return plainToInstance(ProjectClientGroupDto, {
          depth: parseInt(depthStr, 10),
          parentId: parentStr === 'null' ? null : parseInt(parentStr, 10),
          items,
        });
      });
  }

  async getAllClientCount() {
    const counts = await this.findAllClientCount();

    const result = counts.map((item) =>
      plainToInstance(AllClientCountDto, item, {
        excludeExtraneousValues: true,
      }),
    );

    return result;
  }

  // 고객의 상위 또는 하위 고객 조회 (1단계만)
  async getClientRelations(id: number, isDescendant: boolean) {
    if (isDescendant) {
      return this.findDescendants(id);
    } else {
      return this.findAncestors(id);
    }
  }
}

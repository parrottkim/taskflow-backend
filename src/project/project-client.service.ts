import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { ProjectClientClosure } from 'src/entity/project/project-client-closure.entity';
import { ProjectClient } from 'src/entity/project/project-client.entity';
import { Repository } from 'typeorm';
import { AllClientCountDto } from './dto/all-client-count';
import { ProjectClientDto, ProjectClientGroupDto } from './dto/project-client';

@Injectable()
export class ProjectClientService {
  constructor(
    @InjectRepository(ProjectClient)
    private projectClientRepository: Repository<ProjectClient>,

    @InjectRepository(ProjectClientClosure)
    private projectClientClosureRepository: Repository<ProjectClientClosure>,
  ) {}

  // 새로운 고객 생성
  async create(name: string, parentId?: number): Promise<ProjectClient> {
    const client = new ProjectClient();
    client.name = name;
    const savedClient = await this.projectClientRepository.save(client);

    if (parentId) {
      // 부모가 있는 경우: 부모의 Closure Table 레코드를 가져와서 새로운 레코드를 추가
      const parentClosures = await this.projectClientClosureRepository.find({
        where: { descendant: parentId },
      });

      const newClosures = parentClosures.map((parentClosure) => {
        const closure = new ProjectClientClosure();
        closure.ancestor = parentClosure.ancestor;
        closure.descendant = savedClient.id;
        closure.depth = parentClosure.depth + 1;
        return closure;
      });

      const selfClosure = new ProjectClientClosure();
      selfClosure.ancestor = savedClient.id;
      selfClosure.descendant = savedClient.id;
      selfClosure.depth = 0;

      newClosures.push(selfClosure);

      await this.projectClientClosureRepository.save(newClosures);
    } else {
      // 루트 노드의 경우: 자기 자신과의 관계를 Closure Table에 추가
      const closure = new ProjectClientClosure();
      closure.ancestor = savedClient.id;
      closure.descendant = savedClient.id;
      closure.depth = 0;
      await this.projectClientClosureRepository.save(closure);
    }

    return savedClient;
  }

  async findClientById(id: number) {
    return await this.projectClientRepository
      .createQueryBuilder('client')
      .where('client.id = :id', { id })
      .getOne();
  }

  async findRootClients() {
    return await this.projectClientRepository
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

    return await this.projectClientRepository
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
      .orderBy('depth', 'ASC')
      .addOrderBy('parent.ancestor', 'ASC')
      .addOrderBy('client.id', 'ASC')
      .getRawMany();
  }

  async findAllClientCount() {
    const rootNodes = await this.findRootClients();
    const rootIds = rootNodes.map((node) => node.id);

    return await this.projectClientRepository
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
    const descendants = await this.projectClientClosureRepository
      .createQueryBuilder('closure')
      .innerJoinAndSelect('closure.descendantClient', 'descendant')
      .where('closure.ancestor = :clientId', { clientId })
      // .andWhere('closure.depth = :depth', { depth: 1 })
      .getMany();

    return descendants.map((d) => d.descendantClient);
  }

  // 특정 고객의 모든 상위 고객 조회
  async findAncestors(clientId: number) {
    const ancestors = await this.projectClientClosureRepository
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
    const closures = await this.projectClientClosureRepository
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

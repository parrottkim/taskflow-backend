import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, In, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UpdateUserDto, UpdateUserPermissionDto } from './dto/update-user';
import { UserDto, UserListDto } from './dto/user';
import { CreateUserDto } from './dto/create-user';
import { User } from '@/entity/user/user.entity';
import { plainToInstance } from 'class-transformer';
import { GetUsersDto } from './dto/get-users';
import { DepartmentDto, DepartmentGroupDto } from './dto/department';
import { UserDepartment } from '@/entity/user/user-department.entity';
import { PositionDto } from './dto/position';
import { UserPosition } from '@/entity/user/user-position.entity';
import { UserDepartmentClosure } from '@/entity/user/user-department-closure.entity';

@Injectable()
export class UserService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(UserDepartment)
    private readonly userDepartmentRepository: Repository<UserDepartment>,
    @InjectRepository(UserPosition)
    private readonly userPositionRepository: Repository<UserPosition>,
    @InjectRepository(UserDepartmentClosure)
    private readonly userDepartmentClosureRepository: Repository<UserDepartmentClosure>,
  ) {}

  private async mapToUserDtos(users: User[]): Promise<UserDto[]> {
    if (!users.length) return [];

    const departmentIds = [
      ...new Set(users.map((u) => u.department?.id).filter(Boolean)),
    ];

    const closures = departmentIds.length
      ? await this.userDepartmentClosureRepository.find({
          where: { descendant: In(departmentIds) },
          order: { depth: 'DESC' },
        })
      : [];

    const rootMap = new Map<number, number>();
    closures.forEach((c) => {
      if (!rootMap.has(c.descendant)) {
        rootMap.set(c.descendant, c.ancestor);
      }
    });

    return users.map((user) => {
      const dto = plainToInstance(UserDto, user, {
        excludeExtraneousValues: true,
      });
      if (dto.department) {
        dto.department.root =
          rootMap.get(user.department.id) || user.department.id;
      }
      return dto;
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { email },
      relations: ['position', 'department'],
    });
  }

  async findById(id: number): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { id },
      relations: ['position', 'department'],
    });
  }

  async findRootDepartments() {
    return await this.userDepartmentRepository
      .createQueryBuilder('department')
      .leftJoin(
        UserDepartmentClosure,
        'closure',
        'department.id = closure.descendant AND department.id != closure.ancestor',
      )
      .where('closure.ancestor IS NULL')
      .getMany();
  }

  async findAllDepartments() {
    const roots = await this.findRootDepartments();
    const rootIds = roots.map((department) => department.id);

    if (!rootIds.length) return [];

    return await this.userDepartmentRepository
      .createQueryBuilder('department')
      .select('department.id', 'id')
      .addSelect('department.name', 'name')
      .addSelect('MIN(closure.depth)', 'depth')
      .addSelect('parent.ancestor', 'parentId')
      .innerJoin(
        UserDepartmentClosure,
        'closure',
        'department.id = closure.descendant',
      )
      .leftJoin(
        UserDepartmentClosure,
        'parent',
        'parent.descendant = department.id AND parent.depth = 1',
      )
      .where('closure.ancestor IN (:...rootIds)', { rootIds })
      .groupBy('department.id')
      .addGroupBy('parent.ancestor')
      .orderBy('depth', 'ASC')
      .addOrderBy('parent.ancestor', 'ASC')
      .addOrderBy('department.id', 'ASC')
      .getRawMany();
  }

  async getAllDepartments() {
    const departments = await this.findAllDepartments();

    const groupMap = new Map<string, DepartmentDto[]>();

    for (const department of departments) {
      const depth = parseInt(department.depth, 10);
      const parentId = department.parentId
        ? parseInt(department.parentId, 10)
        : null;
      const key = `${depth}|${parentId}`;

      if (!groupMap.has(key)) {
        groupMap.set(key, []);
      }

      const dto = plainToInstance(DepartmentDto, department, {
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
        return plainToInstance(DepartmentGroupDto, {
          depth: parseInt(depthStr, 10),
          parentId: parentStr === 'null' ? null : parseInt(parentStr, 10),
          items,
        });
      });
  }

  async getAllPositions() {
    const positions = await this.userPositionRepository.find({
      order: { id: 'ASC' },
    });
    return plainToInstance(PositionDto, positions, {
      excludeExtraneousValues: true,
    });
  }

  async getUser(id: number) {
    // [1] 유저 및 기본 관계 조회
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['position', 'department'],
    });

    if (!user) throw new UnauthorizedException('user_not_found');

    // [2] DTO 기본 변환
    const dto = plainToInstance(UserDto, user, {
      excludeExtraneousValues: true,
    });

    // [3] 부서 정보가 존재할 경우 최상위(Root) 부서 조회 후 직접 매핑
    if (dto.department) {
      const closure = await this.userDepartmentClosureRepository.findOne({
        where: { descendant: user.department.id },
        order: { depth: 'DESC' },
      });

      dto.department.root = closure ? closure.ancestor : user.department.id;
    }

    return dto;
  }

  // 2. ID별 선택 조회
  async getUsersByIds(ids: number[]) {
    if (!ids?.length) return [];

    const users = await this.userRepository.find({
      where: { id: In(ids) },
      relations: ['position', 'department'],
    });

    return this.mapToUserDtos(users);
  }

  // 3. 검색 및 페이징 로직
  async getUsers(query: GetUsersDto) {
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.position', 'position')
      .leftJoinAndSelect('user.department', 'department');

    if (query.departmentId) {
      const closures = await this.userDepartmentClosureRepository.find({
        where: { ancestor: query.departmentId },
      });
      const departmentIds = closures.length
        ? closures.map((closure) => closure.descendant)
        : [query.departmentId];

      queryBuilder.andWhere('department.id IN (:...departmentIds)', {
        departmentIds,
      });
    }
    if (query.positionId) {
      queryBuilder.andWhere('position.id = :positionId', {
        positionId: query.positionId,
      });
    }
    if (query.search) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.orWhere('user.email ILIKE :search', {
            search: `%${query.search}%`,
          })
            .orWhere('user.username ILIKE :search', {
              search: `%${query.search}%`,
            })
            .orWhere('department.name ILIKE :search', {
              search: `%${query.search}%`,
            })
            .orWhere('position.name ILIKE :search', {
              search: `%${query.search}%`,
            });
        }),
      );
    }

    queryBuilder
      .orderBy('position.id', 'ASC')
      .addOrderBy('user.username', 'ASC');

    const [items, total] = await queryBuilder
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    const mappedItems = await this.mapToUserDtos(items);

    return plainToInstance(UserListDto, {
      items: mappedItems,
      total,
      page: query.page,
    });
  }

  // 4. 전체 조회
  async getAllUsers() {
    const users = await this.userRepository.find({
      relations: ['position', 'department'],
      order: { position: { id: 'ASC' }, username: 'ASC' },
    });

    return this.mapToUserDtos(users);
  }

  async create(dto: CreateUserDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const hashedPassword = await bcrypt.hash(dto.password, 10);
      const user = queryRunner.manager.create(User, {
        ...dto,
        password: hashedPassword,
      });
      const saved = await queryRunner.manager.save(user);

      await queryRunner.commitTransaction();
      return saved;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async update(id: number, dto: UpdateUserDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existingUser = await queryRunner.manager.findOneBy(User, { id });
      if (!existingUser) {
        throw new UnauthorizedException('user_not_found');
      }

      await queryRunner.manager.update(User, id, dto);

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async updatePermission(user: User, id: number, dto: UpdateUserPermissionDto) {
    if (!user.isAdmin) throw new ForbiddenException('no_permission');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existingUser = await queryRunner.manager.findOneBy(User, { id });
      if (!existingUser) throw new UnauthorizedException('user_not_found');

      if (dto.isAdmin !== undefined && dto.isAdmin !== null)
        existingUser.isAdmin = dto.isAdmin;
      if (dto.isAuthorized !== undefined && dto.isAuthorized !== null)
        existingUser.isAuthorized = dto.isAuthorized;

      if (dto.positionId) existingUser.position = { id: dto.positionId } as any;
      if (dto.departmentId)
        existingUser.department = { id: dto.departmentId } as any;

      await queryRunner.manager.save(existingUser);

      const result = await queryRunner.manager.findOne(User, {
        where: { id },
        relations: ['position', 'department'],
      });

      await queryRunner.commitTransaction();
      return result;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async delete(user: User, id: number) {
    if (!user.isAdmin) throw new ForbiddenException('no_permission');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existingUser = await queryRunner.manager.findOneBy(User, { id });
      if (!existingUser) throw new UnauthorizedException('user_not_found');

      await queryRunner.manager.softDelete(User, { id });

      await queryRunner.commitTransaction();
      return true;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}

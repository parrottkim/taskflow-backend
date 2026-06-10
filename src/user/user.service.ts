import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UpdateUserDto, UpdateUserPermissionDto } from './dto/update-user';
import { UserDto, UserListDto } from './dto/user';
import { CreateUserDto } from './dto/create-user';
import { User } from '@/entity/user/user.entity';
import { plainToInstance } from 'class-transformer';
import { GetUsersDto } from './dto/get-users';
import { DepartmentDto } from './dto/department';
import { UserDepartment } from '@/entity/user/user-department.entity';
import { PositionDto } from './dto/position';
import { UserPosition } from '@/entity/user/user-position.entity';
import { UserDepartmentClosure } from '@/entity/user/user-department-closure.entity';

@Injectable()
export class UserService {
  constructor(
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

  async getAllDepartments() {
    const departments = await this.userDepartmentRepository.find({
      order: { id: 'ASC' },
    });
    return plainToInstance(DepartmentDto, departments, {
      excludeExtraneousValues: true,
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
      queryBuilder.andWhere('department.id = :departmentId', {
        departmentId: query.departmentId,
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
      order: { username: 'ASC' },
    });

    return this.mapToUserDtos(users);
  }

  async create(dto: CreateUserDto) {
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = this.userRepository.create({
      ...dto,
      password: hashedPassword,
    });
    return this.userRepository.save(user);
  }

  async update(id: number, dto: UpdateUserDto) {
    const existingUser = await this.userRepository.findOneBy({ id });
    if (!existingUser) {
      throw new UnauthorizedException('user_not_found');
    }

    await this.userRepository.update(id, dto);
  }

  async updatePermission(user: User, id: number, dto: UpdateUserPermissionDto) {
    if (!user.isAdmin) throw new ForbiddenException('no_permission');

    const existingUser = await this.userRepository.findOneBy({ id });
    if (!existingUser) throw new UnauthorizedException('user_not_found');

    // dto에서 undefined나 null이 아닌 값이 들어온 필드만 기존 유저 정보에 갱신
    if (dto.isAdmin !== undefined && dto.isAdmin !== null)
      existingUser.isAdmin = dto.isAdmin;
    if (dto.isAuthorized !== undefined && dto.isAuthorized !== null)
      existingUser.isAuthorized = dto.isAuthorized;

    // position이나 department 관계(Relation) 처리가 필요하다면 아래처럼 id 객체로 할당
    if (dto.positionId) existingUser.position = { id: dto.positionId } as any;
    if (dto.departmentId)
      existingUser.department = { id: dto.departmentId } as any;

    // 1. 먼저 변경된 내용을 데이터베이스에 저장
    await this.userRepository.save(existingUser);

    // 2. [핵심] 조인 관계(relations)를 명시하여 최신 전체 데이터를 다시 조회 후 반환
    return this.userRepository.findOne({
      where: { id },
      relations: ['position', 'department'],
    });
  }

  async delete(user: User, id: number) {
    if (!user.isAdmin) throw new ForbiddenException('no_permission');

    const existingUser = await this.userRepository.findOneBy({ id });
    if (!existingUser) throw new UnauthorizedException('user_not_found');

    await this.userRepository.delete({ id });

    return true;
  }
}

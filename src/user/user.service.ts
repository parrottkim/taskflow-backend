import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UpdateUserDto } from './dto/update-user';
import { UserDto, UserListDto } from './dto/user';
import { CreateUserDto } from './dto/create-user';
import { User } from '@/entity/user/user.entity';
import { plainToInstance } from 'class-transformer';
import { GetUsersDto } from './dto/get-users';
import { DepartmentDto } from './dto/department';
import { UserDepartment } from '@/entity/user/user-department.entity';
import { PositionDto } from './dto/position';
import { UserPosition } from '@/entity/user/user-position.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(UserDepartment)
    private readonly userDepartmentRepository: Repository<UserDepartment>,
    @InjectRepository(UserPosition)
    private readonly userPositionRepository: Repository<UserPosition>,
  ) {}

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

  // 2. 유저 상세 조회 (ID 또는 Email 공용화 가능하지만 명확성을 위해 분리)
  async getUser(id: number) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['position', 'department'],
    });

    if (!user) throw new UnauthorizedException('user_not_found');
    return plainToInstance(UserDto, user, { excludeExtraneousValues: true });
  }

  // 3. 질문하신 ID별 선택 조회 (In 연산자 활용)
  async getUsersByIds(ids: number[]) {
    if (!ids?.length) return [];

    const users = await this.userRepository.find({
      where: { id: In(ids) },
      relations: ['position', 'department'],
    });

    return plainToInstance(UserDto, users, { excludeExtraneousValues: true });
  }

  // 4. 검색 로직 (QueryBuilder가 필요한 유일한 곳)
  async getUsers(query: GetUsersDto) {
    let queryBuilder = this.userRepository
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

    return plainToInstance(UserListDto, { items, total, page: query.page });
  }

  async getAllUsers() {
    const users = await this.userRepository.find({
      relations: ['position', 'department'],
      order: { username: 'ASC' },
    });

    return plainToInstance(UserDto, users, {
      excludeExtraneousValues: true,
    });
  }
  ㅋ;

  async create(dto: CreateUserDto) {
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = this.userRepository.create({
      ...dto,
      password: hashedPassword,
    });
    return this.userRepository.save(user);
  }

  async update(id: number, dto: UpdateUserDto) {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) throw new UnauthorizedException('user_not_found');

    return this.userRepository.save({ ...user, ...dto });
  }
}

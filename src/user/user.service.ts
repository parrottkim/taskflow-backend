import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UpdateUserDto } from './dto/update-user';
import { UserDto, UserListDto } from './dto/user';
import { CreateUserDto } from './dto/create-user';
import { User } from 'src/entity/user/user.entity';
import { plainToInstance } from 'class-transformer';
import { GetUsersDto } from './dto/get-users';
import { DepartmentDto } from './dto/department';
import { UserDepartment } from 'src/entity/user/user-department.entity';
import { PositionDto } from './dto/position';
import { UserPosition } from 'src/entity/user/user-position.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(UserDepartment)
    private readonly userDepartmentRepository: Repository<UserDepartment>,
    @InjectRepository(UserPosition)
    private readonly userPositionRepository: Repository<UserPosition>,
  ) {}

  async findAllDepartments() {
    return await this.userDepartmentRepository
      .createQueryBuilder('department')
      .orderBy('department.id', 'ASC')
      .getMany();
  }

  async findAllPositions() {
    return await this.userPositionRepository
      .createQueryBuilder('position')
      .orderBy('position.id', 'ASC')
      .getMany();
  }

  async findUserById(id: number) {
    return await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.position', 'position')
      .leftJoinAndSelect('user.department', 'department')
      .where('user.id = :id', { id })
      .getOne();
  }

  async findUserByEmail(email: string) {
    return await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.position', 'position')
      .leftJoinAndSelect('user.department', 'department')
      .where('user.email = :email', { email })
      .getOne();
  }

  async findUsers(value: GetUsersDto) {
    let queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.position', 'position')
      .leftJoinAndSelect('user.department', 'department');

    if (value.departmentId) {
      queryBuilder.andWhere('department.id = :departmentId', {
        departmentId: value.departmentId,
      });
    }

    if (value.positionId) {
      queryBuilder.andWhere('position.id = :positionId', {
        positionId: value.positionId,
      });
    }

    if (value.search) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.orWhere('user.email ILIKE :search', {
            search: `%${value.search}%`,
          })
            .orWhere('user.username ILIKE :search', {
              search: `%${value.search}%`,
            })
            .orWhere('department.name ILIKE :search', {
              search: `%${value.search}%`,
            })
            .orWhere('position.name ILIKE :search', {
              search: `%${value.search}%`,
            });
        }),
      );
    }

    queryBuilder
      .orderBy('position.id', 'ASC')
      .addOrderBy('user.username', 'ASC');

    return queryBuilder
      .skip((value.page - 1) * value.limit)
      .take(value.limit)
      .getManyAndCount();
  }

  async findAllUsers() {
    return await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.position', 'position')
      .leftJoinAndSelect('user.department', 'department')
      .getMany();
  }

  async getAllDepartments() {
    const departments = await this.findAllDepartments();

    const result = departments.map((item) =>
      plainToInstance(DepartmentDto, item, {
        excludeExtraneousValues: true,
      }),
    );

    return result;
  }

  async getAllPositions() {
    const positions = await this.findAllPositions();

    const result = positions.map((item) =>
      plainToInstance(PositionDto, item, {
        excludeExtraneousValues: true,
      }),
    );

    return result;
  }

  async getUser(id: number) {
    const user = await this.findUserById(id);

    if (!user) {
      throw new UnauthorizedException('user_not_found');
    }

    return plainToInstance(UserDto, user);
  }

  async getUsers(value: GetUsersDto) {
    const [users, total] = await this.findUsers(value);

    const userListDto = plainToInstance(UserListDto, {
      items: users,
      page: value.page,
      total: total,
    });

    return userListDto;
  }

  async getAllUsers() {
    const users = await this.findAllUsers();

    return users;
  }

  async create(user: CreateUserDto) {
    user.password = await bcrypt.hash(user.password, 10);
    return this.userRepository.save(user);
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const user = await this.findUserById(id);
    if (!user) {
      throw new UnauthorizedException('user_not_found');
    }
    Object.assign(user, updateUserDto);
    return this.userRepository.save(user);
  }
}

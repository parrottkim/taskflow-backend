import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserDepartmentClosure } from '@/entity/user/user-department-closure.entity';
import { UserDepartment } from '@/entity/user/user-department.entity';
import { Repository } from 'typeorm';
import { CreateUserDepartmentDto } from './dto/create-user-department';

@Injectable()
export class UserDepartmentService {
  constructor(
    @InjectRepository(UserDepartment)
    private userDepartmentRepository: Repository<UserDepartment>,

    @InjectRepository(UserDepartmentClosure)
    private userDepartmentClosureRepository: Repository<UserDepartmentClosure>,
  ) {}

  async create(name: string, parentId?: number) {
    const department = new UserDepartment();
    department.name = name;
    const saveDepartment = await this.userDepartmentRepository.save(department);

    if (parentId) {
      // 부모가 있는 경우: 부모의 Closure Table 레코드를 가져와서 새로운 레코드를 추가
      const parentClosures = await this.userDepartmentClosureRepository.find({
        where: { descendant: parentId },
      });

      const newClosures = parentClosures.map((parentClosure) => {
        const closure = new UserDepartmentClosure();
        closure.ancestor = parentClosure.ancestor;
        closure.descendant = saveDepartment.id;
        closure.depth = parentClosure.depth + 1;
        return closure;
      });

      const selfClosure = new UserDepartmentClosure();
      selfClosure.ancestor = saveDepartment.id;
      selfClosure.descendant = saveDepartment.id;
      selfClosure.depth = 0;

      newClosures.push(selfClosure);

      await this.userDepartmentClosureRepository.save(newClosures);
    } else {
      // 루트 노드의 경우: 자기 자신과의 관계를 Closure Table에 추가
      const closure = new UserDepartmentClosure();
      closure.ancestor = saveDepartment.id;
      closure.descendant = saveDepartment.id;
      closure.depth = 0;
      await this.userDepartmentClosureRepository.save(closure);
    }

    return saveDepartment;
  }
}

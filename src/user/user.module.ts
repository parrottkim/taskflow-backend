import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User } from '@/entity/user/user.entity';
import { UserPosition } from '@/entity/user/user-position.entity';
import { UserDepartment } from '@/entity/user/user-department.entity';
import { UserDepartmentClosure } from '@/entity/user/user-department-closure.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserPosition,
      UserDepartment,
      UserDepartmentClosure,
    ]),
  ],
  providers: [UserService],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}

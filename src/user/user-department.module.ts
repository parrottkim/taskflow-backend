import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserDepartmentClosure } from 'src/entity/user/user-department-closure.entity';
import { UserDepartment } from 'src/entity/user/user-department.entity';
import { UserDepartmentController } from './user-department.controller';
import { UserDepartmentService } from './user-department.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserDepartment, UserDepartmentClosure])],
  providers: [UserDepartmentService],
  controllers: [UserDepartmentController],
  exports: [UserDepartmentService],
})
export class UserDepartmentModule {}

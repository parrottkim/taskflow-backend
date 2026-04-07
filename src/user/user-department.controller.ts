import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserDepartmentService } from './user-department.service';
import { JwtAccessAuthGuard } from '@/common/guards/jwt-access-auth.guard';

@ApiTags('User Department (사용자 부서)')
@Controller('user-department')
export class UserDepartmentController {
  constructor(private readonly departmentService: UserDepartmentService) {}

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '사용자 부서 생성' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @Post('create')
  async createDepartment(
    @Body('name') name: string,
    @Body('parent_id') parentId?: number,
  ) {
    return this.departmentService.create(name, parentId);
  }
}

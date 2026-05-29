import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
  Request,
  Delete,
  HttpCode,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAccessAuthGuard } from '@/common/guards/jwt-access-auth.guard';
import { UserDto, UserListDto } from './dto/user';
import { UserService } from './user.service';
import { GetUsersDto } from './dto/get-users';
import { UpdateUserDto, UpdateUserPermissionDto } from './dto/update-user';

@ApiTags('User (사용자)')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '부서 목록 조회' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: UserListDto,
  })
  @Get('department')
  getAllDepartments() {
    return this.userService.getAllDepartments();
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '직급 목록 조회' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: UserListDto,
  })
  @Get('position')
  getAllPositions() {
    return this.userService.getAllPositions();
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '모든 사용자 정보 조회' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: UserListDto,
  })
  @Get('all')
  getAllUsers() {
    return this.userService.getAllUsers();
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '사용자 정보 조회' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: UserDto,
  })
  @Get(':id')
  getUser(@Param('id', ParseIntPipe) id: number) {
    return this.userService.getUser(id);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '사용자 목록 조회' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: UserListDto,
  })
  @Get()
  getUsers(@Query() query: GetUsersDto) {
    return this.userService.getUsers(query);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '사용자 권한 수정' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: UserDto,
  })
  @Patch(':id/permission')
  updateUserPermission(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateUserPermissionDto,
  ) {
    return this.userService.updatePermission(req.user, id, body);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '사용자 정보 수정' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: UserDto,
  })
  @Patch(':id')
  updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateUserDto,
  ) {
    return this.userService.update(id, body);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '사용자 삭제' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
  })
  @Delete(':id')
  @HttpCode(200)
  async deleteUser(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.userService.delete(req.user, id);
  }
}

import {
  Controller,
  UseGuards,
  HttpStatus,
  Get,
  Query,
  Param,
  Request,
  Post,
  Patch,
  Delete,
  ParseIntPipe,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiResponse } from '@nestjs/swagger';
import { JwtAccessAuthGuard } from '@/common/guards/jwt-access-auth.guard';
import { ProjectService } from './project.service';
import { ProjectDto, ProjectListDto } from './dto/project';
import { GetProjectsDto } from './dto/get-projects';
import { CreateProjectDto } from './dto/create-project';
import { UpdateProjectDto } from './dto/update-project';
import { ProjectItemCountDto } from './dto/project-item-count';

@ApiTags('Project (프로젝트)')
@Controller('project')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '프로젝트 항목 개수' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: ProjectItemCountDto,
  })
  @Get(':id/count')
  getProjectItemCount(@Param('id', ParseIntPipe) id: number) {
    return this.projectService.getProjectItemCount(id);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '프로젝트 수정용 데이터 조회 (권한 강화)' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: ProjectDto,
  })
  @Get(':id/edit')
  getProjectForEdit(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.projectService.getProjectForEdit(req.user, id);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '프로젝트 단일 조회' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: ProjectDto,
  })
  @Get(':id')
  getProject(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.projectService.getProject(req.user, id);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '프로젝트 목록 조회' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: ProjectListDto,
  })
  @Get()
  getProjects(@Request() req, @Query() query: GetProjectsDto) {
    return this.projectService.getProjects(req.user, query);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '프로잭트 생성' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: ProjectDto,
  })
  @Post()
  createProject(@Request() req, @Body() body: CreateProjectDto) {
    return this.projectService.createProject(req.user, body);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '프로젝트 수정' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: ProjectDto,
  })
  @Patch(':id')
  updateProject(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateProjectDto,
  ) {
    return this.projectService.updateProject(req.user, id, body);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '프로젝트 삭제' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
  })
  @Delete(':id')
  async deleteProject(@Param('id', ParseIntPipe) id: number) {
    return this.projectService.deleteProject(id);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '프로젝트 복구' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
  })
  @Patch(':id/restore')
  async restoreProject(@Param('id', ParseIntPipe) id: number) {
    return this.projectService.restoreProject(id);
  }
}

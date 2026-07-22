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
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiResponse } from '@nestjs/swagger';
import { JwtAccessAuthGuard } from '@/common/guards/jwt-access-auth.guard';
import { ProjectService } from './project.service';
import { ProjectDto, ProjectListDto } from './dto/project';
import { GetProjectsDto } from './dto/get-projects';
import { CreateProjectDto } from './dto/create-project';
import { UpdateProjectDto } from './dto/update-project';
import { ProjectItemCountDto } from './dto/project-item-count';
import { WriteAccessGuard } from '@/common/guards/write-access.guard';
import { ProjectEditGuard } from '@/common/guards/project-edit.guard';

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

  @UseGuards(JwtAccessAuthGuard, ProjectEditGuard)
  @ApiOperation({ summary: '프로젝트 수정용 데이터 조회' })
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
  getProjectDetail(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.projectService.getProjectDetail(req.user, id);
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

  @UseGuards(JwtAccessAuthGuard, WriteAccessGuard)
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

  @UseGuards(JwtAccessAuthGuard, WriteAccessGuard)
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

  @UseGuards(JwtAccessAuthGuard, WriteAccessGuard)
  @ApiOperation({ summary: '프로젝트 삭제' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
  })
  @Delete(':id')
  @HttpCode(200)
  async deleteProject(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.projectService.deleteProject(req.user, id);
  }

  @UseGuards(JwtAccessAuthGuard, WriteAccessGuard)
  @ApiOperation({ summary: '프로젝트 복구' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
  })
  @Patch(':id/restore')
  async restoreProject(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.projectService.restoreProject(req.user, id);
  }
}

// project-customer.controller.ts
import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  ParseIntPipe,
  Query,
  ParseBoolPipe,
  UseGuards,
  HttpStatus,
  DefaultValuePipe,
} from '@nestjs/common';
import { ProjectClientService } from './project-client.service';
import { ApiOperation, ApiHeader, ApiTags, ApiResponse } from '@nestjs/swagger';
import { JwtAccessAuthGuard } from 'src/common/guards/jwt-access-auth.guard';
import { ProjectClientDto } from './dto/project-client';
import { AllClientCountDto } from './dto/all-client-count';

@ApiTags('Project Client (프로젝트 고객사)')
@Controller('project-client')
export class ProjectClientController {
  constructor(private readonly clientService: ProjectClientService) {}

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '프로젝트 고객사 생성' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @Post('create')
  async createClient(
    @Body('name') name: string,
    @Body('parent_id') parentId?: number,
  ) {
    return this.clientService.create(name, parentId);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '전체 고객사 조회' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: [ProjectClientDto],
  })
  @Get()
  async getAllClients() {
    return this.clientService.getAllClients();
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '전체 고객사 집계' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: [AllClientCountDto],
  })
  @Get('count')
  async getAllClientCount() {
    return this.clientService.getAllClientCount();
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({
    summary: '프로젝트 고객사 관계 조회',
    description:
      '하위 카테고리는 1 Depth만 조회하며, 상위 카테고리는 모두 조회',
  })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: [ProjectClientDto],
  })
  @Get(':id/relations')
  async getClientRelations(
    @Param('id', ParseIntPipe) id: number,
    @Query('is_descendant', new DefaultValuePipe(true), ParseBoolPipe)
    isDescendant: boolean,
  ) {
    return this.clientService.getClientRelations(id, isDescendant);
  }
}

import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  UseGuards,
  Request,
} from '@nestjs/common';
import { DocumentFolderService } from './document-folder.service';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAccessAuthGuard } from '@/common/guards/jwt-access-auth.guard';
import { DocumentFolderDto } from './dto/document-folder';
import { CreateFolderDto } from './dto/create-folder';
import { UpdateFolderDto } from './dto/update-folder';
import { SyncDocumentFoldersDto } from './dto/sync-folders';
import { WriteAccessGuard } from '@/common/guards/write-access.guard';

@ApiTags('Document Folder (문서 폴더)')
@Controller('document-folder')
export class DocumentFolderController {
  constructor(private readonly folderService: DocumentFolderService) {}

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '전체 폴더 조회' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: [DocumentFolderDto],
  })
  @Get()
  async getAllFolders() {
    return this.folderService.getAllFolders();
  }

  @UseGuards(JwtAccessAuthGuard, WriteAccessGuard)
  @ApiOperation({ summary: '문서 폴더 트리 동기화' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: [DocumentFolderDto],
  })
  @Put()
  async syncFolders(@Request() req, @Body() body: SyncDocumentFoldersDto) {
    return this.folderService.sync(req.user, body);
  }

  @UseGuards(JwtAccessAuthGuard, WriteAccessGuard)
  @ApiOperation({ summary: '문서 폴더 생성' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @Post()
  async createFolder(@Request() req, @Body() body: CreateFolderDto) {
    return this.folderService.create(req.user, body);
  }

  @UseGuards(JwtAccessAuthGuard, WriteAccessGuard)
  @ApiOperation({ summary: '문서 폴더 수정' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @Patch(':id')
  async updateFolder(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateFolderDto,
  ) {
    return this.folderService.update(req.user, id, body);
  }
}

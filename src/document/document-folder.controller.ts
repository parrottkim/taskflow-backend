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

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '문서 폴더 트리 동기화' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: [DocumentFolderDto],
  })
  @Put()
  async syncFolders(@Body() body: SyncDocumentFoldersDto) {
    return this.folderService.sync(body);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '문서 폴더 생성' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @Post()
  async createFolder(@Body() body: CreateFolderDto) {
    return this.folderService.create(body);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '문서 폴더 수정' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @Patch(':id')
  async updateFolder(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateFolderDto,
  ) {
    return this.folderService.update(id, body);
  }
}

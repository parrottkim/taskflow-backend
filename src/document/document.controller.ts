import {
  Controller,
  Get,
  HttpStatus,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  Param,
  Post,
  Body,
  Delete,
  HttpCode,
  Patch,
} from '@nestjs/common';
import { DocumentService } from './document.service';
import { JwtAccessAuthGuard } from '@/common/guards/jwt-access-auth.guard';
import { ApiTags, ApiOperation, ApiHeader, ApiResponse } from '@nestjs/swagger';
import { DocumentDto, DocumentListDto } from './dto/document';
import { GetDocumentsDto } from './dto/get-documents';
import { DocumentEditGuard } from '@/common/guards/document-edit.guard';
import { CreateDocumentDto } from './dto/create-document';
import { UpdateDocumentDto } from './dto/update-document';

@ApiTags('Document (문서)')
@Controller('document')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @UseGuards(JwtAccessAuthGuard, DocumentEditGuard)
  @ApiOperation({ summary: '폴더 별 문서 조회' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: DocumentDto,
  })
  @Get(':id/edit')
  getDocumentForEdit(@Param('id', ParseIntPipe) id: number) {
    return this.documentService.getDocument(id);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '폴더 별 문서 조회' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: DocumentListDto,
  })
  @Get()
  getDocuments(@Query() query: GetDocumentsDto) {
    return this.documentService.getDocuments(query);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '문서 생성' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: DocumentDto,
  })
  @Post()
  async createDocument(@Request() req, @Body() body: CreateDocumentDto) {
    return this.documentService.createDocument(req.user, body);
  }

  @UseGuards(JwtAccessAuthGuard, DocumentEditGuard)
  @ApiOperation({ summary: '문서 수정' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: DocumentDto,
  })
  @Patch(':id')
  updateDocument(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateDocumentDto,
  ) {
    return this.documentService.updateDocument(req.user, id, body);
  }

  @UseGuards(JwtAccessAuthGuard, DocumentEditGuard)
  @ApiOperation({ summary: '문서 삭제' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
  })
  @Delete(':id')
  @HttpCode(200)
  async deleteDocument(@Param('id', ParseIntPipe) id: number) {
    return this.documentService.deleteDocument(id);
  }
}

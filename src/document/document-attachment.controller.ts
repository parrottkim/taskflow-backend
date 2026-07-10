import {
  Controller,
  HttpStatus,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  ParseIntPipe,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  Request,
  Delete,
  HttpCode,
} from '@nestjs/common';
import { DocumentAttachmentService } from './document-attachment.service';
import { JwtAccessAuthGuard } from '@/common/guards/jwt-access-auth.guard';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DocumentAttachmentDto } from './dto/document-attachment';

@ApiTags('Document Attachments (문서 첨부파일)')
@Controller('document/:document_id/attachments')
export class DocumentAttachmentController {
  constructor(
    private readonly documentAttachmentService: DocumentAttachmentService,
  ) {}

  @UseGuards(JwtAccessAuthGuard)
  @UseInterceptors(FilesInterceptor('files'))
  @ApiOperation({ summary: '첨부 파일 업로드' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: [DocumentAttachmentDto],
  })
  @Post()
  uploadAttachments(
    @Request() req,
    @Param('document_id', ParseIntPipe) documentId: number,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 50 })],
        fileIsRequired: true,
      }),
    )
    files: Express.Multer.File[],
  ) {
    return this.documentAttachmentService.uploadAttachments(
      req.user,
      documentId,
      files,
    );
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '첨부 파일 삭제' })
  @Delete(':file_id')
  @HttpCode(200)
  deleteAttachment(
    @Request() req,
    @Param('document_id', ParseIntPipe) documentId: number,
    @Param('file_id', ParseIntPipe) fileId: number,
  ) {
    return this.documentAttachmentService.deleteAttachment(
      req.user,
      documentId,
      fileId,
    );
  }
}

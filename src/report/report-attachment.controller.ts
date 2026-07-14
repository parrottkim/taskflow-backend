import {
  UseGuards,
  Controller,
  Post,
  UseInterceptors,
  Param,
  ParseIntPipe,
  UploadedFiles,
  ParseFilePipe,
  MaxFileSizeValidator,
  Delete,
  Request,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAccessAuthGuard } from '@/common/guards/jwt-access-auth.guard';
import { ReportAttachmentService } from './report-attachment.service';
import { ReportAttachmentDto } from './dto/report-attachment';
import { WriteAccessGuard } from '@/common/guards/write-access.guard';

@ApiTags('Report Attachments (이슈 첨부파일)')
@Controller('report/:report_id/attachments')
export class ReportAttachmentController {
  constructor(
    private readonly reportAttachmentService: ReportAttachmentService,
  ) {}

  @UseGuards(JwtAccessAuthGuard, WriteAccessGuard)
  @UseInterceptors(FilesInterceptor('files'))
  @ApiOperation({ summary: '첨부 파일 업로드' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: [ReportAttachmentDto],
  })
  @Post()
  uploadAttachments(
    @Request() req,
    @Param('report_id', ParseIntPipe) reportId: number,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 50 })],
        fileIsRequired: true,
      }),
    )
    files: Express.Multer.File[],
  ) {
    return this.reportAttachmentService.uploadAttachments(
      req.user,
      reportId,
      files,
    );
  }

  @UseGuards(JwtAccessAuthGuard, WriteAccessGuard)
  @ApiOperation({ summary: '첨부 파일 삭제' })
  @Delete(':file_id')
  @HttpCode(200)
  deleteAttachment(
    @Request() req,
    @Param('report_id', ParseIntPipe) reportId: number,
    @Param('file_id', ParseIntPipe) fileId: number,
  ) {
    return this.reportAttachmentService.deleteAttachment(
      req.user,
      reportId,
      fileId,
    );
  }
}

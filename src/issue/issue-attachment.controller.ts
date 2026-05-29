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
import { IssueAttachmentService } from './issue-attachment.service';
import { IssueAttachmentDto } from './dto/issue-attachment';

@ApiTags('Issue Attachments (이슈 첨부파일)')
@Controller('issue/:issue_id/attachments')
export class IssueAttachmentController {
  constructor(
    private readonly issueAttachmentService: IssueAttachmentService,
  ) {}

  @UseGuards(JwtAccessAuthGuard)
  @UseInterceptors(FilesInterceptor('files'))
  @ApiOperation({ summary: '첨부 파일 업로드' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: [IssueAttachmentDto],
  })
  @Post()
  uploadAttachments(
    @Request() req,
    @Param('issue_id', ParseIntPipe) issueId: number,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 50 })],
        fileIsRequired: true,
      }),
    )
    files: Express.Multer.File[],
  ) {
    return this.issueAttachmentService.uploadAttachments(
      req.user,
      issueId,
      files,
    );
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '첨부 파일 삭제' })
  @Delete(':file_id')
  @HttpCode(200)
  deleteAttachment(
    @Request() req,
    @Param('issue_id', ParseIntPipe) issueId: number,
    @Param('file_id', ParseIntPipe) fileId: number,
  ) {
    return this.issueAttachmentService.deleteAttachment(
      req.user,
      issueId,
      fileId,
    );
  }
}

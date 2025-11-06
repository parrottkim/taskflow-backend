import {
  Controller,
  Get,
  HttpStatus,
  NotFoundException,
  Post,
  Query,
  Request,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  Response,
  Delete,
  Param,
  MaxFileSizeValidator,
  ParseFilePipe,
  UploadedFile,
} from '@nestjs/common';
import { SftpService } from './sftp.service';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiHeader, ApiResponse } from '@nestjs/swagger';
import { JwtAccessAuthGuard } from 'src/common/guards/jwt-access-auth.guard';
import { UploadInlineImageDto } from './dto/upload-inline-image';

@Controller('files')
export class SftpController {
  constructor(private readonly sftpService: SftpService) {}

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '이슈 인라인 이미지 업로드' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: UploadInlineImageDto,
  })
  @Post('inline-image')
  @UseInterceptors(FilesInterceptor('files'))
  async uploadInlineImage(
    @Request() req,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 5 })],
        fileIsRequired: true,
      }),
    )
    files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new Error('파일이 없습니다');
    }

    return await this.sftpService.uploadInlineImages(req.user, files);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '공급처 로고 업로드' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: UploadInlineImageDto,
  })
  @Post('supplier')
  @UseInterceptors(FileInterceptor('file'))
  async uploadInlinImage(
    @Request() req,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 5 })],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
  ) {
    return await this.sftpService.uploadSupplierLogo(req.user, file);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '파일 다운로드' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
  })
  @Get('download')
  async downloadFile(@Query('path') path: string, @Response() res) {
    if (!path) {
      throw new NotFoundException('path_not_found');
    }

    const { buffer, fileName } = await this.sftpService.downloadFile(path);

    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '파일 다운로드' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
  })
  @Delete(':url')
  async deleteFile(@Param('url') url: string) {}
}

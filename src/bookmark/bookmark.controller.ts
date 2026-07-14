import {
  Controller,
  Get,
  HttpStatus,
  UseGuards,
  Request,
  Param,
  Post,
  Delete,
} from '@nestjs/common';
import { BookmarkService } from './bookmark.service';
import { ApiTags, ApiOperation, ApiHeader, ApiResponse } from '@nestjs/swagger';
import { JwtAccessAuthGuard } from '@/common/guards/jwt-access-auth.guard';
import { BookmarkDto } from './dto/bookmark';
import { WriteAccessGuard } from '@/common/guards/write-access.guard';

@ApiTags('Bookmark (북마크)')
@Controller('bookmark')
export class BookmarkController {
  constructor(private readonly bookmarkService: BookmarkService) {}

  @UseGuards(JwtAccessAuthGuard, WriteAccessGuard)
  @ApiOperation({ summary: '프로젝트 북마크 추가' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: BookmarkDto,
  })
  @Post(':id')
  addBookmark(@Request() req, @Param('id') id: number) {
    return this.bookmarkService.addBookmark(req.user, Number(id));
  }

  @UseGuards(JwtAccessAuthGuard, WriteAccessGuard)
  @ApiOperation({ summary: '프로젝트 북마크 추가' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: BookmarkDto,
  })
  @Delete(':id')
  removeBookmark(@Request() req, @Param('id') id: number) {
    return this.bookmarkService.removeBookmark(req.user, Number(id));
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IssueEditGuard } from '@/common/guards/issue-edit.guard';
import { IssueProcurementRequestGuard } from '@/common/guards/issue-procurement-request.guard';
import { JwtAccessAuthGuard } from '@/common/guards/jwt-access-auth.guard';
import { WriteAccessGuard } from '@/common/guards/write-access.guard';
import { GetLatestIssuesDto } from './dto/get-latest-issues';
import { SendIssueMailDto } from './dto/send-issue-mail';
import { IssueService } from './issue.service';

@ApiTags('Issue (이슈)')
@UseGuards(JwtAccessAuthGuard)
@Controller('issue')
export class IssueController {
  constructor(private readonly issueService: IssueService) {}

  @ApiOperation({ summary: '전체 카테고리 조회' })
  @Get('categories')
  getAllCategories() {
    return this.issueService.getAllCategories();
  }

  @ApiOperation({ summary: '최근 업데이트된 이슈 조회' })
  @Get('latest')
  getLatestIssues(@Query() value: GetLatestIssuesDto) {
    return this.issueService.getLatestIssues(value);
  }

  @ApiOperation({ summary: '카테고리 가져오기 (단건)' })
  @Get('categories/:id')
  getCategory(@Param('id', ParseIntPipe) id: number) {
    return this.issueService.getCategory(id);
  }

  @UseGuards(WriteAccessGuard)
  @ApiOperation({ summary: '이슈 메일 전송' })
  @Post('mail/:id')
  sendMail(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: SendIssueMailDto,
  ) {
    return this.issueService.sendMail(req.user, id, body.userIds);
  }

  @UseGuards(IssueProcurementRequestGuard)
  @ApiOperation({ summary: '발주 요청용 데이터 조회' })
  @Get(':id/procurement/request')
  getIssueForProcurementRequest(@Param('id', ParseIntPipe) id: number) {
    return this.issueService.getIssue(id);
  }

  @UseGuards(IssueEditGuard)
  @ApiOperation({ summary: '이슈 수정용 데이터 조회' })
  @Get(':id/edit')
  getIssueForEdit(@Param('id', ParseIntPipe) id: number) {
    return this.issueService.getIssue(id);
  }

  @ApiOperation({ summary: '이슈 조회 (기본 ID 단건)' })
  @Get(':id')
  getIssue(@Param('id', ParseIntPipe) id: number) {
    return this.issueService.getIssue(id);
  }

  @UseGuards(WriteAccessGuard)
  @ApiOperation({ summary: '이슈 삭제' })
  @Delete(':id')
  deleteIssue(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.issueService.deleteIssue(req.user, id);
  }
}

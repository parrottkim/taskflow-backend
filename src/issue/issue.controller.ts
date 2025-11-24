import {
  Controller,
  Get,
  HttpStatus,
  Post,
  Query,
  UseGuards,
  Request,
  Patch,
  Delete,
  Param,
  ParseIntPipe,
  Body,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IssueService } from './issue.service';
import { JwtAccessAuthGuard } from 'src/common/guards/jwt-access-auth.guard';
import { CreateIssueDto } from './dto/create-issue';
import { GetLatestIssuesDto } from './dto/get-latest-issues';
import { GetIssuesDto } from './dto/get-issues';
import { LatestIssueDto } from './dto/latest-issue';
import { IssueDto } from './dto/issue';
import { IssueCategoryDto } from './dto/issue-category';
import { TransactionIssueItemCategoryDto } from './dto/issue-details';
import { UpdateIssueDto } from './dto/update-issue';
@ApiTags('Issue (이슈)')
@Controller('issue')
export class IssueController {
  constructor(private readonly issueService: IssueService) {}

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '전체 카테고리 조회' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: [IssueCategoryDto],
  })
  @Get('categories')
  async getAllCategories() {
    return this.issueService.getAllCategories();
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '거래 명세 카테고리 조회' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: [TransactionIssueItemCategoryDto],
  })
  @Get('transaction/categories')
  async getAllTransactionCategories() {
    return this.issueService.getAllTransactionCategories();
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '최근 업데이트된 이슈 조회' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: LatestIssueDto,
  })
  @Get('latest')
  getLatestIssues(@Query() value: GetLatestIssuesDto) {
    return this.issueService.getLatestIssues(value);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '이슈 목록 조회' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: IssueDto,
  })
  @Get(':id')
  getIssue(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.issueService.getIssueWithUser(req.user, id);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '이슈 목록 조회' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: LatestIssueDto,
  })
  @Get()
  getIssues(@Query() value: GetIssuesDto) {
    return this.issueService.getIssues(value);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '이슈 메일 전송' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
  })
  @Post('mail/:id')
  sendMail(@Param('id', ParseIntPipe) id: number) {
    return this.issueService.sendMail(id);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '이슈 등록' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: IssueDto,
  })
  @Post()
  createIssue(@Request() req, @Body() value: CreateIssueDto) {
    return this.issueService.createIssue(req.user, value);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '이슈 수정' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: IssueDto,
  })
  @Patch(':id')
  updateIssue(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() value: UpdateIssueDto,
  ) {
    return this.issueService.updateIssue(req.user, id, value);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '이슈 수정' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @Delete(':id')
  async deleteIssue(@Param('id', ParseIntPipe) id: number) {
    return this.issueService.deleteIssue(id);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '이슈 수정' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: IssueDto,
  })
  @Patch(':id/restore')
  async restoreIssue(@Param('id', ParseIntPipe) id: number) {
    return this.issueService.restoreIssue(id);
  }
}

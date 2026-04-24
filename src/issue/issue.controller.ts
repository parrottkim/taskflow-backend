import {
  Controller,
  Get,
  HttpStatus,
  Post,
  UseGuards,
  Request,
  Patch,
  Delete,
  Param,
  ParseIntPipe,
  Body,
  Query,
  Response,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IssueService } from './issue.service';
import { JwtAccessAuthGuard } from '@/common/guards/jwt-access-auth.guard';
import { IssueCategoryDto } from './dto/issue-category';
import { IssueDto } from './dto/issue';
import { LatestIssueDto } from './dto/latest-issue';
import { GetLatestIssuesDto } from './dto/get-latest-issues';
import { GetIssuesDto } from './dto/get-issues';
import {
  CreateApprovalIssueDto,
  CreateContractIssueDto,
  CreateKickoffIssueDto,
  CreatePaymentIssueDto,
  CreateProcurementIssueDto,
  CreateTransactionIssueDto,
} from './dto/create-issue';
import {
  UpdateApprovalIssueDto,
  UpdateContractIssueDto,
  UpdateKickoffIssueDto,
  UpdatePaymentIssueDto,
  UpdateProcurementIssueDto,
  UpdateTransactionIssueDto,
} from './dto/update-issue';
import { SendIssueMailDto } from './dto/send-issue-mail';
@ApiTags('Issue (이슈)')
@Controller('issue')
export class IssueController {
  constructor(private readonly issueService: IssueService) {}

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '카테고리 가져오기' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: IssueCategoryDto,
  })
  @Get('categories/:id')
  async getCategory(@Param('id', ParseIntPipe) id: number) {
    return this.issueService.getCategory(id);
  }

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
  @ApiOperation({ summary: '구매 조달 이슈 출력' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
  })
  @Get('procurement/export/:id')
  async exportPurchaseRequest(
    @Param('id', ParseIntPipe) id: number,
    @Response() res,
  ) {
    const { buffer, filename } =
      await this.issueService.exportPurchaseRequest(id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '계약 이슈 조회' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: LatestIssueDto,
  })
  @Get('contract/item/:id')
  getContractItems(@Param('id', ParseIntPipe) id: number) {
    return this.issueService.getContractItems(id);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '계약 이슈 조회' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: LatestIssueDto,
  })
  @Get('transaction/item/:id')
  getTransactionItems(@Param('id', ParseIntPipe) id: number) {
    return this.issueService.getTransactionItems(id);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '계약 이슈 조회' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: LatestIssueDto,
  })
  @Get('contract/:id')
  getContractIssue(@Param('id', ParseIntPipe) id: number) {
    return this.issueService.getContractIssue(id);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '킥어프 이슈 조회' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: LatestIssueDto,
  })
  @Get('kickoff/:id')
  getKickoffIssue(@Param('id', ParseIntPipe) id: number) {
    return this.issueService.getKickoffIssue(id);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '거래명세/인보이스 이슈 조회' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: LatestIssueDto,
  })
  @Get('transaction/:id')
  getTransactionIssue(@Param('id', ParseIntPipe) id: number) {
    return this.issueService.getTransactionIssue(id);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '지급 청구 이슈 조회' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: LatestIssueDto,
  })
  @Get('payment/:id')
  getPaymentIssue(@Param('id', ParseIntPipe) id: number) {
    return this.issueService.getPaymentIssue(id);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '사양 승인 이슈 조회' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: LatestIssueDto,
  })
  @Get('approval')
  getApprovalIssues(@Query() query: GetIssuesDto) {
    return this.issueService.getApprovalIssues(query);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '구매 조달 이슈 조회' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Successful response' })
  @Get('procurement')
  getProcurementIssues(@Query() query: GetIssuesDto) {
    return this.issueService.getProcurementIssues(query);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '이슈 조회 (ID)' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: IssueDto,
  })
  @Get(':id')
  getIssue(@Param('id', ParseIntPipe) id: number) {
    return this.issueService.getIssue(id);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '이슈 메일 전송' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
  })
  @Post('mail/:id')
  sendMail(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: SendIssueMailDto,
  ) {
    return this.issueService.sendMail(id, body.userIds);
  }

  // ==================== Create Issue APIs ====================
  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '계약 이슈 등록' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @Post('contract')
  async createContractIssue(
    @Request() req,
    @Body() body: CreateContractIssueDto,
  ) {
    return this.issueService.createContractIssue(req.user, body);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '킥오프 이슈 등록' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @Post('kickoff')
  async createKickoffIssue(
    @Request() req,
    @Body() body: CreateKickoffIssueDto,
  ) {
    return this.issueService.createKickoffIssue(req.user, body);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '사양 승인 이슈 등록' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @Post('approval')
  async createApprovalIssue(
    @Request() req,
    @Body() body: CreateApprovalIssueDto,
  ) {
    return this.issueService.createApprovalIssue(req.user, body);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '구매 조달 이슈 등록' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @Post('procurement')
  async createProcurementIssue(
    @Request() req,
    @Body() body: CreateProcurementIssueDto,
  ) {
    return this.issueService.createProcurementIssue(req.user, body);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '거래명세 이슈 등록' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @Post('transaction')
  async createTransactionIssue(
    @Request() req,
    @Body() body: CreateTransactionIssueDto,
  ) {
    return this.issueService.createTransactionIssue(req.user, body);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '지급 청구 이슈 등록' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @Post('payment')
  async createPaymentIssue(
    @Request() req,
    @Body() body: CreatePaymentIssueDto,
  ) {
    return this.issueService.createPaymentIssue(req.user, body);
  }

  // // ==================== Update Issue APIs ====================
  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '계약 이슈 수정' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @Patch(':id/contract')
  async updateContractIssue(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateContractIssueDto,
  ) {
    return this.issueService.updateContractIssue(req.user, id, body);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '킥오프 이슈 수정' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @Patch(':id/kickoff')
  async updateKickoffIssue(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateKickoffIssueDto,
  ) {
    return this.issueService.updateKickoffIssue(req.user, id, body);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '사양 승인 이슈 수정' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @Patch(':id/approval')
  async updateApprovalIssue(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateApprovalIssueDto,
  ) {
    return this.issueService.updateApprovalIssue(req.user, id, body);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '구매 조달 이슈 수정' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @Patch(':id/procurement')
  async updateProcurementIssue(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateProcurementIssueDto,
  ) {
    return this.issueService.updateProcurementIssue(req.user, id, body);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '거래명세 이슈 수정' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @Patch(':id/transaction')
  async updateTransactionIssue(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateTransactionIssueDto,
  ) {
    return this.issueService.updateTransactionIssue(req.user, id, body);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '지급 청구 이슈 수정' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @Patch(':id/payment')
  async updatePaymentIssue(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdatePaymentIssueDto,
  ) {
    return this.issueService.updatePaymentIssue(req.user, id, body);
  }

  // ==================== Delete Issue API ====================
  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '이슈 삭제' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @Delete(':id')
  async deleteIssue(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.issueService.deleteIssue(req.user, id);
  }
}

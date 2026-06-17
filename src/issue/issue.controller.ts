import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  Request,
  Patch,
  Delete,
  Param,
  ParseIntPipe,
  Query,
  Response,
  HttpCode,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IssueService } from './issue.service';
import { JwtAccessAuthGuard } from '@/common/guards/jwt-access-auth.guard';
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
import { CreateProcurementRequestDto } from './dto/procurement-issue-request';
import { IssueEditGuard } from '@/common/guards/issue-edit.guard';
import { IssueProcurementRequestGuard } from '@/common/guards/issue-procurement-request.guard';

@ApiTags('Issue (이슈)')
@Controller('issue')
export class IssueController {
  constructor(private readonly issueService: IssueService) {}

  // =========================================================================
  // [공통 & 글로벌 마스터 API] - 완전 고정형 주소 (최상단 배치)
  // =========================================================================
  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '전체 카테고리 조회' })
  @Get('categories')
  async getAllCategories() {
    return this.issueService.getAllCategories();
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '최근 업데이트된 이슈 조회' })
  @Get('latest')
  getLatestIssues(@Query() value: GetLatestIssuesDto) {
    return this.issueService.getLatestIssues(value);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '거래 명세 카테고리 조회' })
  @Get('transaction/categories') // 🌟 고정 Static 주소이므로 와일드카드보다 위에 배치
  async getAllTransactionCategories() {
    return this.issueService.getAllTransactionCategories();
  }

  // =========================================================================
  // [도메인별 목록 조회 API] - 파라미터가 없는 카테고리 메인 주소들 (차상단 배치)
  // =========================================================================
  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '사양 승인 이슈 목록 조회' })
  @Get('approval') // 🌟 고정 주소이므로 아래의 모든 :id 기반 주소들보다 위에 있어야 가로채이지 않습니다.
  getApprovalIssues(@Query() query: GetIssuesDto) {
    return this.issueService.getApprovalIssues(query);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '구매 조달 이슈 목록 조회' })
  @Get('procurement') // 🌟 고정 주소이므로 아래의 모든 :id 기반 주소들보다 위에 있어야 가로채이지 않습니다.
  getProcurementIssues(@Query() query: GetIssuesDto) {
    return this.issueService.getProcurementIssues(query);
  }

  // =========================================================================
  // [도메인별 세부 액션 및 상세 조회 API] - 자식이 붙은 라우트들 (`/:id/하위주소`)
  // =========================================================================

  // --- CONTRACT ---
  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '계약 목록 조회' })
  @Get('contract/:id/items') // 🌟 자식이 붙었으므로 contract/:id 단독 조회보다 위에 배치
  getContractItems(@Param('id', ParseIntPipe) id: number) {
    return this.issueService.getContractItems(id);
  }

  // --- PROCUREMENT ---
  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '구매 요청서 출력' })
  @Get('procurement/:id/export-request') // 🌟 자식이 붙은 주소 상단 배치
  async exportPurchaseRequest(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Response() res,
  ) {
    const { buffer, filename } = await this.issueService.exportPurchaseRequest(
      id,
      req.user,
    );
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '발주서 출력' })
  @Get('procurement/:id/export-order') // 🌟 자식이 붙은 주소 상단 배치
  async exportPurchaseOrder(
    @Param('id', ParseIntPipe) id: number,
    @Response() res,
  ) {
    const { buffer, filename } =
      await this.issueService.exportPurchaseOrder(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '구매 요청' })
  @Patch('procurement/:id/request') // 🌟 자식이 붙은 주소 상단 배치
  async createProcurementIssueRequest(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CreateProcurementRequestDto,
  ) {
    return this.issueService.createProcurementIssueRequest(req.user, id, body);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '구매 요청 승인권자 승인' })
  @Patch('procurement/:id/approve') // 🌟 자식이 붙은 주소 상단 배치
  @HttpCode(200)
  async approveProcurementIssueRequest(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.issueService.approveProcurementIssueRequest(req.user, id);
  }

  // --- TRANSACTION ---
  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '거래 명세 목록 조회' })
  @Get('transaction/:id/items') // 🌟 자식이 붙었으므로 transaction/:id 단독 조회보다 위에 배치
  getTransactionItems(@Param('id', ParseIntPipe) id: number) {
    return this.issueService.getTransactionItems(id);
  }

  // =========================================================================
  // [도메인별 단독 ID 및 CUD API] - 각 카테고리별 기본 `/카테고리/:id` 형태들
  // =========================================================================

  // --- CONTRACT ---
  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '계약 이슈 조회' })
  @Get('contract/:id')
  getContractIssue(@Param('id', ParseIntPipe) id: number) {
    return this.issueService.getContractIssue(id);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '계약 이슈 등록' })
  @Post('contract')
  async createContractIssue(
    @Request() req,
    @Body() body: CreateContractIssueDto,
  ) {
    return this.issueService.createContractIssue(req.user, body);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '계약 이슈 수정' })
  @Patch('contract/:id')
  async updateContractIssue(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateContractIssueDto,
  ) {
    return this.issueService.updateContractIssue(req.user, id, body);
  }

  // --- KICKOFF ---
  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '킥어프 이슈 조회' })
  @Get('kickoff/:id')
  getKickoffIssue(@Param('id', ParseIntPipe) id: number) {
    return this.issueService.getKickoffIssue(id);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '킥오프 이슈 등록' })
  @Post('kickoff')
  async createKickoffIssue(
    @Request() req,
    @Body() body: CreateKickoffIssueDto,
  ) {
    return this.issueService.createKickoffIssue(req.user, body);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '킥오프 이슈 수정' })
  @Patch('kickoff/:id')
  async updateKickoffIssue(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateKickoffIssueDto,
  ) {
    return this.issueService.updateKickoffIssue(req.user, id, body);
  }

  // --- APPROVAL ---
  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '사양 승인 이슈 등록' })
  @Post('approval')
  async createApprovalIssue(
    @Request() req,
    @Body() body: CreateApprovalIssueDto,
  ) {
    return this.issueService.createApprovalIssue(req.user, body);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '사양 승인 이슈 수정' })
  @Patch('approval/:id')
  async updateApprovalIssue(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateApprovalIssueDto,
  ) {
    return this.issueService.updateApprovalIssue(req.user, id, body);
  }

  // --- PROCUREMENT ---
  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '구매 조달 이슈 등록' })
  @Post('procurement')
  async createProcurementIssue(
    @Request() req,
    @Body() body: CreateProcurementIssueDto,
  ) {
    return this.issueService.createProcurementIssue(req.user, body);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '구매 조달 이슈 수정' })
  @Patch('procurement/:id')
  async updateProcurementIssue(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateProcurementIssueDto,
  ) {
    return this.issueService.updateProcurementIssue(req.user, id, body);
  }

  // --- TRANSACTION ---
  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '거래명세/인보이스 이슈 조회' })
  @Get('transaction/:id')
  getTransactionIssue(@Param('id', ParseIntPipe) id: number) {
    return this.issueService.getTransactionIssue(id);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '거래명세 이슈 등록' })
  @Post('transaction')
  async createTransactionIssue(
    @Request() req,
    @Body() body: CreateTransactionIssueDto,
  ) {
    return this.issueService.createTransactionIssue(req.user, body);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '거래명세 이슈 수정' })
  @Patch('transaction/:id')
  async updateTransactionIssue(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateTransactionIssueDto,
  ) {
    return this.issueService.updateTransactionIssue(req.user, id, body);
  }

  // --- PAYMENT ---
  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '지급 청구 이슈 조회' })
  @Get('payment/:id')
  getPaymentIssue(@Param('id', ParseIntPipe) id: number) {
    return this.issueService.getPaymentIssue(id);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '지급 청구 이슈 등록' })
  @Post('payment')
  async createPaymentIssue(
    @Request() req,
    @Body() body: CreatePaymentIssueDto,
  ) {
    return this.issueService.createPaymentIssue(req.user, body);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '지급 청구 이슈 수정' })
  @Patch('payment/:id')
  async updatePaymentIssue(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdatePaymentIssueDto,
  ) {
    return this.issueService.updatePaymentIssue(req.user, id, body);
  }

  // =========================================================================
  // [글로벌 터미널 및 공통 ID 액션] - 가장 포괄적인 와일드카드 (최하단 고정)
  // =========================================================================
  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '카테고리 가져오기 (단건)' })
  @Get('categories/:id') // 주소에 고정 세그먼트 'categories'가 들어있으므로 아래의 공통 :id 보단 위에 위치
  async getCategory(@Param('id', ParseIntPipe) id: number) {
    return this.issueService.getCategory(id);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '이슈 메일 전송' })
  @Post('mail/:id')
  sendMail(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: SendIssueMailDto,
  ) {
    return this.issueService.sendMail(id, body.userIds);
  }

  @UseGuards(JwtAccessAuthGuard, IssueProcurementRequestGuard)
  @ApiOperation({ summary: '발주 요청용 데이터 조회' })
  @Get(':id/procurement/request')
  getIssueForProcurementRequest(@Param('id', ParseIntPipe) id: number) {
    return this.issueService.getIssue(id);
  }

  @UseGuards(JwtAccessAuthGuard, IssueEditGuard)
  @ApiOperation({ summary: '이슈 수정용 데이터 조회' })
  @Get(':id/edit')
  getIssueForEdit(@Param('id', ParseIntPipe) id: number) {
    // 가드를 통과했으므로 안전하게 동일한 조회 메서드 호출
    return this.issueService.getIssue(id);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '이슈 조회 (기본 ID 단건)' })
  @Get(':id') // 🚨 무조건 클래스 최하단 격리
  getIssue(@Param('id', ParseIntPipe) id: number) {
    return this.issueService.getIssue(id);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '이슈 삭제' })
  @Delete(':id') // 🚨 무조건 클래스 최하단 격리
  async deleteIssue(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.issueService.deleteIssue(req.user, id);
  }
}

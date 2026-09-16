import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  Response,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAccessAuthGuard } from '@/common/guards/jwt-access-auth.guard';
import { WriteAccessGuard } from '@/common/guards/write-access.guard';
import { CreateProcurementIssueDto } from '../dto/create-issue';
import { GetIssuesDto } from '../dto/get-issues';
import {
  CreateProcurementRequestDto,
  UpdateProcurementRequestDto,
} from '../dto/procurement-issue-request';
import { UpdateProcurementIssueDto } from '../dto/update-issue';
import { ProcurementIssueExportService } from './procurement-issue-export.service';
import { ProcurementIssueService } from './procurement-issue.service';

@ApiTags('Issue - 구매 조달')
@UseGuards(JwtAccessAuthGuard)
@Controller('issue/procurement')
export class ProcurementIssueController {
  constructor(
    private readonly procurementIssueService: ProcurementIssueService,
    private readonly issueExportService: ProcurementIssueExportService,
  ) {}

  @ApiOperation({ summary: '구매 조달 이슈 목록 조회' })
  @Get()
  getProcurementIssues(@Query() query: GetIssuesDto) {
    return this.procurementIssueService.getProcurementIssues(query);
  }

  @ApiOperation({ summary: '구매 요청서 출력' })
  @Get(':id/export-request')
  async exportPurchaseRequest(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Response() res,
  ) {
    const { buffer, filename } =
      await this.issueExportService.exportPurchaseRequest(id, req.user);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @ApiOperation({ summary: '발주서 출력' })
  @Get(':id/export-order')
  async exportPurchaseOrder(
    @Param('id', ParseIntPipe) id: number,
    @Response() res,
  ) {
    const { buffer, filename } =
      await this.issueExportService.exportPurchaseOrder(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @UseGuards(WriteAccessGuard)
  @ApiOperation({ summary: '구매 요청' })
  @Patch(':id/request')
  createProcurementIssueRequest(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CreateProcurementRequestDto,
  ) {
    return this.procurementIssueService.createProcurementIssueRequest(
      req.user,
      id,
      body,
    );
  }

  @UseGuards(WriteAccessGuard)
  @ApiOperation({ summary: '구매 요청 내역 수정' })
  @Patch('request/:id')
  updateProcurementIssueRequest(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateProcurementRequestDto,
  ) {
    return this.procurementIssueService.updateProcurementIssueRequest(
      req.user,
      id,
      body,
    );
  }

  @UseGuards(WriteAccessGuard)
  @ApiOperation({ summary: '구매 요청 승인권자 승인' })
  @Patch(':id/approve')
  @HttpCode(200)
  approveProcurementIssueRequest(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.procurementIssueService.approveProcurementIssueRequest(
      req.user,
      id,
    );
  }

  @UseGuards(WriteAccessGuard)
  @ApiOperation({ summary: '구매 요청 내역 삭제' })
  @Delete('request/:id')
  @HttpCode(200)
  deleteProcurementIssueRequest(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.procurementIssueService.deleteProcurementIssueRequest(
      req.user,
      id,
    );
  }

  @UseGuards(WriteAccessGuard)
  @ApiOperation({ summary: '구매 조달 이슈 등록' })
  @Post()
  createProcurementIssue(
    @Request() req,
    @Body() body: CreateProcurementIssueDto,
  ) {
    return this.procurementIssueService.createProcurementIssue(req.user, body);
  }

  @UseGuards(WriteAccessGuard)
  @ApiOperation({ summary: '구매 조달 이슈 수정' })
  @Patch(':id')
  updateProcurementIssue(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateProcurementIssueDto,
  ) {
    return this.procurementIssueService.updateProcurementIssue(
      req.user,
      id,
      body,
    );
  }
}

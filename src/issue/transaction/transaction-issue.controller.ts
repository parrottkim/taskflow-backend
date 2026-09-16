import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAccessAuthGuard } from '@/common/guards/jwt-access-auth.guard';
import { WriteAccessGuard } from '@/common/guards/write-access.guard';
import { CreateTransactionIssueDto } from '../dto/create-issue';
import { UpdateTransactionIssueDto } from '../dto/update-issue';
import { TransactionIssueService } from './transaction-issue.service';

@ApiTags('Issue - 거래 명세')
@UseGuards(JwtAccessAuthGuard)
@Controller('issue/transaction')
export class TransactionIssueController {
  constructor(
    private readonly transactionIssueService: TransactionIssueService,
  ) {}

  @ApiOperation({ summary: '거래 명세 카테고리 조회' })
  @Get('categories')
  getAllTransactionCategories() {
    return this.transactionIssueService.getAllTransactionCategories();
  }

  @ApiOperation({ summary: '거래 명세 목록 조회' })
  @Get(':id/items')
  getTransactionItems(@Param('id', ParseIntPipe) id: number) {
    return this.transactionIssueService.getTransactionItems(id);
  }

  @ApiOperation({ summary: '거래명세/인보이스 이슈 조회' })
  @Get(':id')
  getTransactionIssue(@Param('id', ParseIntPipe) id: number) {
    return this.transactionIssueService.getTransactionIssue(id);
  }

  @UseGuards(WriteAccessGuard)
  @ApiOperation({ summary: '거래명세 이슈 등록' })
  @Post()
  createTransactionIssue(
    @Request() req,
    @Body() body: CreateTransactionIssueDto,
  ) {
    return this.transactionIssueService.createTransactionIssue(req.user, body);
  }

  @UseGuards(WriteAccessGuard)
  @ApiOperation({ summary: '거래명세 이슈 수정' })
  @Patch(':id')
  updateTransactionIssue(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateTransactionIssueDto,
  ) {
    return this.transactionIssueService.updateTransactionIssue(
      req.user,
      id,
      body,
    );
  }
}

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
import { CreatePaymentIssueDto } from '../dto/create-issue';
import { UpdatePaymentIssueDto } from '../dto/update-issue';
import { PaymentIssueService } from './payment-issue.service';

@ApiTags('Issue - 지급 청구')
@UseGuards(JwtAccessAuthGuard)
@Controller('issue/payment')
export class PaymentIssueController {
  constructor(private readonly paymentIssueService: PaymentIssueService) {}

  @ApiOperation({ summary: '지급 청구 이슈 조회' })
  @Get(':id')
  getPaymentIssue(@Param('id', ParseIntPipe) id: number) {
    return this.paymentIssueService.getPaymentIssue(id);
  }

  @UseGuards(WriteAccessGuard)
  @ApiOperation({ summary: '지급 청구 이슈 등록' })
  @Post()
  createPaymentIssue(@Request() req, @Body() body: CreatePaymentIssueDto) {
    return this.paymentIssueService.createPaymentIssue(req.user, body);
  }

  @UseGuards(WriteAccessGuard)
  @ApiOperation({ summary: '지급 청구 이슈 수정' })
  @Patch(':id')
  updatePaymentIssue(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdatePaymentIssueDto,
  ) {
    return this.paymentIssueService.updatePaymentIssue(req.user, id, body);
  }
}

import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAccessAuthGuard } from '@/common/guards/jwt-access-auth.guard';
import { WriteAccessGuard } from '@/common/guards/write-access.guard';
import { ApprovalIssueService } from './approval-issue.service';
import { CreateApprovalIssueDto } from '../dto/create-issue';
import { GetIssuesDto } from '../dto/get-issues';
import { UpdateApprovalIssueDto } from '../dto/update-issue';

@ApiTags('Issue - 사양 승인')
@UseGuards(JwtAccessAuthGuard)
@Controller('issue/approval')
export class ApprovalIssueController {
  constructor(private readonly approvalIssueService: ApprovalIssueService) {}

  @ApiOperation({ summary: '사양 승인 이슈 목록 조회' })
  @Get()
  getApprovalIssues(@Query() query: GetIssuesDto) {
    return this.approvalIssueService.getApprovalIssues(query);
  }

  @UseGuards(WriteAccessGuard)
  @ApiOperation({ summary: '사양 승인 이슈 등록' })
  @Post()
  createApprovalIssue(@Request() req, @Body() body: CreateApprovalIssueDto) {
    return this.approvalIssueService.createApprovalIssue(req.user, body);
  }

  @UseGuards(WriteAccessGuard)
  @ApiOperation({ summary: '사양 승인 이슈 수정' })
  @Patch(':id')
  updateApprovalIssue(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateApprovalIssueDto,
  ) {
    return this.approvalIssueService.updateApprovalIssue(req.user, id, body);
  }
}

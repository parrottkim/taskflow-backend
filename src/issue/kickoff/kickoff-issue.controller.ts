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
import { CreateKickoffIssueDto } from '../dto/create-issue';
import { UpdateKickoffIssueDto } from '../dto/update-issue';
import { KickoffIssueService } from './kickoff-issue.service';

@ApiTags('Issue - 킥오프')
@UseGuards(JwtAccessAuthGuard)
@Controller('issue/kickoff')
export class KickoffIssueController {
  constructor(private readonly kickoffIssueService: KickoffIssueService) {}

  @ApiOperation({ summary: '킥어프 이슈 조회' })
  @Get(':id')
  getKickoffIssue(@Param('id', ParseIntPipe) id: number) {
    return this.kickoffIssueService.getKickoffIssue(id);
  }

  @UseGuards(WriteAccessGuard)
  @ApiOperation({ summary: '킥오프 이슈 등록' })
  @Post()
  createKickoffIssue(@Request() req, @Body() body: CreateKickoffIssueDto) {
    return this.kickoffIssueService.createKickoffIssue(req.user, body);
  }

  @UseGuards(WriteAccessGuard)
  @ApiOperation({ summary: '킥오프 이슈 수정' })
  @Patch(':id')
  updateKickoffIssue(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateKickoffIssueDto,
  ) {
    return this.kickoffIssueService.updateKickoffIssue(req.user, id, body);
  }
}

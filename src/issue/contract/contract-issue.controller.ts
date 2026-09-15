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
import { ContractIssueService } from './contract-issue.service';
import { CreateContractIssueDto } from '../dto/create-issue';
import { UpdateContractIssueDto } from '../dto/update-issue';

@ApiTags('Issue - 계약')
@UseGuards(JwtAccessAuthGuard)
@Controller('issue/contract')
export class ContractIssueController {
  constructor(private readonly contractIssueService: ContractIssueService) {}

  @ApiOperation({ summary: '계약 목록 조회' })
  @Get(':id/items')
  getContractItems(@Param('id', ParseIntPipe) id: number) {
    return this.contractIssueService.getContractItems(id);
  }

  @ApiOperation({ summary: '계약 이슈 조회' })
  @Get(':id')
  getContractIssue(@Param('id', ParseIntPipe) id: number) {
    return this.contractIssueService.getContractIssue(id);
  }

  @UseGuards(WriteAccessGuard)
  @ApiOperation({ summary: '계약 이슈 등록' })
  @Post()
  createContractIssue(@Request() req, @Body() body: CreateContractIssueDto) {
    return this.contractIssueService.createContractIssue(req.user, body);
  }

  @UseGuards(WriteAccessGuard)
  @ApiOperation({ summary: '계약 이슈 수정' })
  @Patch(':id')
  updateContractIssue(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateContractIssueDto,
  ) {
    return this.contractIssueService.updateContractIssue(req.user, id, body);
  }
}

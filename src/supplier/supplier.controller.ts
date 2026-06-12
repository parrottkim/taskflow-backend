import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SupplierService } from './supplier.service';
import { ApiOperation, ApiHeader, ApiResponse } from '@nestjs/swagger';
import { JwtAccessAuthGuard } from '@/common/guards/jwt-access-auth.guard';
import { SupplierDto, SupplierListDto } from './dto/supplier';
import { GetSuppliersDto } from './dto/get-suppliers';
import { CreateSupplierDto } from './dto/create-supplier';
import { UpdateSupplierDto } from './dto/update-supplier';

@Controller('supplier')
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '일정 가져오기' })
  @ApiHeader({
    name: 'Authorization',
    description: 'Refresh Token',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: SupplierDto,
  })
  @Get(':id')
  async getSupplier(@Param('id', ParseIntPipe) id: number) {
    return await this.supplierService.getSupplier(id);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '공급처 목록 조회' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: SupplierListDto,
  })
  @Get()
  async getSuppliers(@Query() query: GetSuppliersDto) {
    return this.supplierService.getSuppliers(query);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '공급처 생성' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: SupplierDto,
  })
  @Post()
  async createSupplier(@Body() body: CreateSupplierDto) {
    return this.supplierService.createSupplier(body);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '공급처 수정' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: SupplierDto,
  })
  @Patch(':id')
  async updateSupplier(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateSupplierDto,
  ) {
    return this.supplierService.updateSupplier(id, body);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '공급처 삭제' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
  })
  @Delete(':id')
  @HttpCode(200)
  async deleteSupplier(@Param('id', ParseIntPipe) id: number) {
    return this.supplierService.deleteSupplier(id);
  }
}

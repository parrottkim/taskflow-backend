import { Controller, Get, HttpStatus, Query, UseGuards } from '@nestjs/common';
import { AddressService } from './address.service';
import { BookmarkDto } from '@/bookmark/dto/bookmark';
import { JwtAccessAuthGuard } from '@/common/guards/jwt-access-auth.guard';
import { ApiOperation, ApiHeader, ApiResponse } from '@nestjs/swagger';
import { SearchAddressDto } from './dto/search-address';

@Controller('address')
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '주소 검색' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: BookmarkDto,
  })
  @Get('search')
  async search(@Query() query: SearchAddressDto) {
    return await this.addressService.fetchFromJusoApi(query);
  }
}

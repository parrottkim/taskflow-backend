import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from '../common/guards/local-auth.guard';
import { JwtRefreshAuthGuard } from '../common/guards/jwt-refresh-auth.guard';
import {
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TokenDto } from './dto/token';
import { LoginRequestDto } from './dto/login-request';
import { CreateUserDto } from 'src/user/dto/create-user';
import { ResetPasswordDto } from './dto/reset-password';
import { ForgotPasswordDto } from './dto/forgot-password';

@ApiTags('Authorization (인증)')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @ApiOperation({ summary: '로그인' })
  @ApiBody({ type: LoginRequestDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: TokenDto,
  })
  @Post('login')
  async login(@Request() req) {
    return await this.authService.login(req.user);
  }

  @ApiOperation({ summary: '회원가입' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: TokenDto,
  })
  @Post('register')
  async register(@Body() value: CreateUserDto) {
    return await this.authService.register(value);
  }

  @UseGuards(JwtRefreshAuthGuard)
  @ApiOperation({ summary: '토큰 리프레시' })
  @ApiHeader({
    name: 'Authorization',
    description: 'Refresh Token',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: TokenDto,
  })
  @Post('refresh')
  async refrshToken(@Request() req) {
    return this.authService.refreshToken(req.user);
  }

  @ApiOperation({ summary: '비밀번호 재설정 요청' })
  @Post('forgot-password')
  @HttpCode(200)
  async forgotPassword(@Body() value: ForgotPasswordDto) {
    await this.authService.forgotPassword(value);
  }

  @ApiOperation({ summary: '새로운 비밀번호 설정' })
  @Post('reset-password')
  async resetPassword(@Body() value: ResetPasswordDto) {
    return await this.authService.resetPassword(value);
  }
}

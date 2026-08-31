import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from '../common/guards/local-auth.guard';
import { JwtRefreshAuthGuard } from '../common/guards/jwt-refresh-auth.guard';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LoginRequestDto } from './dto/login-request';
import { CreateUserDto } from '@/user/dto/create-user';
import { ResetPasswordDto } from './dto/reset-password';
import { ForgotPasswordDto } from './dto/forgot-password';
import config from '@/config/config';
import { ConfigType } from '@nestjs/config';
import { TokenDto } from './dto/token';
import { AuthOriginGuard } from '@/common/guards/auth-origin.guard';

@ApiTags('Authorization (인증)')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    @Inject(config.KEY)
    private readonly configService: ConfigType<typeof config>,
  ) {}

  @UseGuards(AuthOriginGuard, LocalAuthGuard)
  @ApiOperation({ summary: '로그인' })
  @ApiBody({ type: LoginRequestDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Access token을 반환하고 HttpOnly refresh 쿠키를 설정합니다.',
    type: TokenDto,
  })
  @Post('login')
  async login(
    @Body() value: LoginRequestDto,
    @Request() req,
    @Res({ passthrough: true }) response: Response,
  ) {
    const tokens = await this.authService.login(req.user, value.persistLogin);
    response.cookie(
      this.configService.cookie.refresh.name,
      tokens.refreshToken,
      {
        ...this.configService.cookie.refresh.options,
        ...(tokens.refreshTokenMaxAge !== undefined && {
          maxAge: tokens.refreshTokenMaxAge,
        }),
      },
    );
    return { accessToken: tokens.accessToken };
  }

  @ApiOperation({ summary: '회원가입' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
  })
  @Post('register')
  async register(@Body() value: CreateUserDto) {
    return await this.authService.register(value);
  }

  @UseGuards(AuthOriginGuard, JwtRefreshAuthGuard)
  @ApiOperation({ summary: '토큰 리프레시' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Access token을 반환하고 refresh 쿠키를 회전합니다.',
    type: TokenDto,
  })
  @Post('refresh')
  async refreshToken(
    @Request() req,
    @Res({ passthrough: true }) response: Response,
  ) {
    const tokens = await this.authService.refreshToken(req.user);
    response.cookie(
      this.configService.cookie.refresh.name,
      tokens.refreshToken,
      {
        ...this.configService.cookie.refresh.options,
        ...(tokens.refreshTokenMaxAge !== undefined && {
          maxAge: tokens.refreshTokenMaxAge,
        }),
      },
    );
    return { accessToken: tokens.accessToken };
  }

  @ApiOperation({ summary: '로그아웃' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Refresh token이 무효화되고 인증 쿠키가 제거됩니다.',
  })
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthOriginGuard)
  async logout(@Request() req, @Res({ passthrough: true }) response: Response) {
    const refreshToken = req.cookies?.[this.configService.cookie.refresh.name];
    await this.authService.logout(refreshToken ?? null);
    response.clearCookie(
      this.configService.cookie.refresh.name,
      this.configService.cookie.refresh.options,
    );
  }

  @ApiOperation({ summary: '비밀번호 재설정 요청' })
  @Post('forgot-password')
  @HttpCode(200)
  async forgotPassword(@Body() value: ForgotPasswordDto) {
    await this.authService.forgotPassword(value);
  }

  @ApiOperation({ summary: '새로운 비밀번호 설정' })
  @Post('reset-password')
  @HttpCode(200)
  async resetPassword(@Body() value: ResetPasswordDto) {
    return await this.authService.resetPassword(value);
  }
}

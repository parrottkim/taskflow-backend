import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import config from '@/config/config';
import { ConfigType } from '@nestjs/config';
import { User } from '@/entity/user/user.entity';
import { CreateUserDto } from '@/user/dto/create-user';
import { UserService } from '@/user/user.service';
import { plainToInstance } from 'class-transformer';
import { UserDto } from '@/user/dto/user';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';
import { MailService } from '@/mail/mail.service';
import { ForgotPasswordDto } from './dto/forgot-password';
import { ResetPasswordDto } from './dto/reset-password';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { createHash, randomUUID } from 'node:crypto';

interface RefreshSession {
  id: number;
  email: string;
  persistLogin?: boolean;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    @Inject(config.KEY)
    private configService: ConfigType<typeof config>,
    @InjectRedis() private readonly redisClient: Redis,
  ) {}

  async validateUser(email: string, pass: string) {
    const user = await this.userService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('unauthorized_credentials_invalid');
    }

    if (!user.isAuthorized) {
      throw new ForbiddenException('forbidden_user_not_approved');
    }

    if (user && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: User, persistLogin = false) {
    const payload = { email: user.email, sub: user.id, persistLogin };
    const accessTokenExpiresIn = this.configService.jwt
      .accessTokenExpiration as any;
    const refreshTokenExpiresIn = this.configService.jwt
      .refreshTokenExpiration as any;
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.jwt.jwtAccessSecret,
      expiresIn: accessTokenExpiresIn,
    });
    const refreshToken = this.jwtService.sign(
      { ...payload, jti: randomUUID() },
      {
        secret: this.configService.jwt.jwtRefreshSecret,
        expiresIn: refreshTokenExpiresIn,
      },
    );

    if (!user.isAuthorized) {
      throw new ForbiddenException('forbidden_user_not_approved');
    }

    await this.userService.updateAuthentication(user.id, {
      refreshToken: this.hashRefreshToken(refreshToken),
    });

    return {
      accessToken,
      refreshToken,
      refreshTokenMaxAge: persistLogin
        ? Math.max(
            ((this.jwtService.decode(refreshToken) as { exp?: number })?.exp ||
              0) *
              1000 -
              Date.now(),
            0,
          )
        : undefined,
    };
  }

  async register(value: CreateUserDto) {
    try {
      const user = await this.userService.create(value);

      return plainToInstance(UserDto, user, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      // TypeORM/Postgres 에러 코드 확인을 위한 타입 가드
      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === '23505') {
          throw new ConflictException('conflict_user_email_already_exists');
        }
      }

      // 처리되지 않은 에러는 그대로 던지기
      throw error;
    }
  }

  async refreshToken(user: RefreshSession) {
    const existingUser = await this.userService.findById(user.id);
    if (!existingUser) {
      throw new UnauthorizedException('unauthorized_user_not_found');
    }
    if (!existingUser.isAuthorized) {
      await this.userService.updateAuthentication(existingUser.id, {
        refreshToken: null,
      });
      throw new ForbiddenException('forbidden_user_not_approved');
    }

    const payload = {
      email: existingUser.email,
      sub: existingUser.id,
      persistLogin: user.persistLogin === true,
    };
    const accessTokenExpiresIn = this.configService.jwt
      .accessTokenExpiration as any;
    const refreshTokenExpiresIn = this.configService.jwt
      .refreshTokenExpiration as any;
    const newAccessToken = this.jwtService.sign(payload, {
      secret: this.configService.jwt.jwtAccessSecret,
      expiresIn: accessTokenExpiresIn,
    });
    const newRefreshToken = this.jwtService.sign(
      { ...payload, jti: randomUUID() },
      {
        secret: this.configService.jwt.jwtRefreshSecret,
        expiresIn: refreshTokenExpiresIn,
      },
    );

    const rotated = await this.userService.rotateRefreshToken(
      existingUser.id,
      this.hashRefreshToken(user.refreshToken),
      this.hashRefreshToken(newRefreshToken),
    );
    if (!rotated) {
      throw new UnauthorizedException('unauthorized_refresh_token_reused');
    }

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      refreshTokenMaxAge: user.persistLogin
        ? Math.max(
            ((this.jwtService.decode(newRefreshToken) as { exp?: number })
              ?.exp || 0) *
              1000 -
              Date.now(),
            0,
          )
        : undefined,
    };
  }

  async logout(refreshToken: string | null) {
    if (!refreshToken) return;

    try {
      const payload = this.jwtService.verify<{ sub: number }>(refreshToken, {
        secret: this.configService.jwt.jwtRefreshSecret,
        ignoreExpiration: true,
      });
      const user = await this.userService.findById(payload.sub);

      if (user?.refreshToken === this.hashRefreshToken(refreshToken)) {
        await this.userService.updateAuthentication(user.id, {
          refreshToken: null,
        });
      }
    } catch {
      // Logout is idempotent: malformed/expired sessions still have cookies cleared.
    }
  }

  private hashRefreshToken(refreshToken: string): string {
    return createHash('sha256').update(refreshToken).digest('hex');
  }

  async forgotPassword(value: ForgotPasswordDto) {
    const cooldownKey = `forgot-password-cooldown:${value.email}`;
    const cooldownPeriod = 60; // 60초 (1분) 쿨다운
    const tokenKey = `reset-token:${value.email}`;

    // 1. Redis에서 쿨다운 키 확인
    const isCooldown = await this.redisClient.get(cooldownKey);

    if (isCooldown) {
      // 쿨다운 기간 내에 다시 요청했을 경우 에러 발생
      throw new HttpException(
        'too_many_requests_forgot_password',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    try {
      const user = await this.userService.findByEmail(value.email);

      if (!user) {
      }

      await this.redisClient.del(tokenKey);

      const resetToken = uuidv4();
      const redisKey = `reset-token:${resetToken}`;
      const userIdString = user.id.toString();

      await this.redisClient.set(redisKey, userIdString, 'EX', 600);

      // 3. 이메일 전송 (사용자가 있는 경우에만)
      if (user) {
        await this.mailService.sendResetPassword(value.email, resetToken);
      }

      // 4. 쿨다운 키 설정 (1분 = 60초)
      // 요청이 성공적으로 처리되었거나 사용자 존재 유무와 관계없이
      // 메일 발송 시도 자체에 대해 쿨다운을 적용합니다.
      await this.redisClient.set(cooldownKey, '1', 'EX', cooldownPeriod);

      return true;
    } catch (e) {
      console.log(e);
    }
  }

  async resetPassword(value: ResetPasswordDto) {
    const redisKey = `reset-token:${value.token}`;

    const userIdString = await this.redisClient.get(redisKey);

    if (!userIdString) {
      throw new UnauthorizedException(
        'unauthorized_reset_token_invalid_or_expired',
      );
    }

    const userId = parseInt(userIdString, 10);
    const user = await this.userService.findById(userId);

    if (!user) {
      throw new UnauthorizedException(
        'unauthorized_reset_token_invalid_or_expired',
      );
    }

    // 3. 새 비밀번호 해싱 및 업데이트
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(value.newPassword, salt);
    await this.userService.updateAuthentication(userId, {
      password: hashedPassword,
      refreshToken: null,
    });

    // 4. 토큰 무효화: 비밀번호 업데이트 후 Redis에서 토큰 삭제 (DEL key)
    await this.redisClient.del(redisKey);

    return true;
  }
}

import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import config from 'config';
import { ConfigType } from '@nestjs/config';
import { User } from 'src/entity/user/user.entity';
import { CreateUserDto } from 'src/user/dto/create-user';
import { UserService } from 'src/user/user.service';
import { plainToInstance } from 'class-transformer';
import { UserDto } from 'src/user/dto/user';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';
import { MailService } from 'src/mail/mail.service';
import { firstValueFrom } from 'rxjs';
import { ForgotPasswordDto } from './dto/forgot-password';
import { ResetPasswordDto } from './dto/reset-password';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

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
    const user = await this.userService.findUserByEmail(email);

    if (!user) {
      throw new UnauthorizedException('user_not_found');
    }

    if (!user.isAuthorized) {
      throw new ForbiddenException('not_approved');
    }

    if (user && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: User) {
    const payload = { email: user.email, sub: user.id };
    const accessTokenExpiresIn = this.configService.jwt
      .accessTokenExpiration as any;
    const refreshTokenExpiresIn = this.configService.jwt
      .refreshTokenExpiration as any;
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.jwt.jwtAccessSecret,
      expiresIn: accessTokenExpiresIn,
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.jwt.jwtRefreshSecret,
      expiresIn: refreshTokenExpiresIn,
    });

    if (!user.isAuthorized) {
      throw new ForbiddenException('not_approved');
    }

    user.refreshToken = refreshToken;
    await this.userService.update(user.id, user);

    return {
      accessToken,
      refreshToken,
    };
  }

  async register(value: CreateUserDto) {
    try {
      const user = await this.userService.create(value);

      return plainToInstance(UserDto, user, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      // Handle specific errors with appropriate HTTP status codes
      if (error.code === '23505') {
        throw new ConflictException('user_exists');
      } else {
        throw error;
      }
    }
  }

  async refreshToken(user: User) {
    const payload = { email: user.email, sub: user.id };
    const existingUser = await this.userService.findUserById(payload.sub);
    if (!existingUser) {
      throw new UnauthorizedException('user_not_found');
    }
    const accessTokenExpiresIn = this.configService.jwt
      .accessTokenExpiration as any;
    const refreshTokenExpiresIn = this.configService.jwt
      .refreshTokenExpiration as any;
    const newAccessToken = this.jwtService.sign(payload, {
      secret: this.configService.jwt.jwtAccessSecret,
      expiresIn: accessTokenExpiresIn,
    });
    const newRefreshToken = this.jwtService.sign(payload, {
      secret: this.configService.jwt.jwtRefreshSecret,
      expiresIn: refreshTokenExpiresIn,
    });

    user.refreshToken = newRefreshToken;
    await this.userService.update(user.id, user);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async forgotPassword(value: ForgotPasswordDto) {
    const cooldownKey = `forgot-password-cooldown:${value.email}`;
    const cooldownPeriod = 60; // 60초 (1분) 쿨다운
    const tokenKey = `reset-token:${value.email}`;

    // 1. Redis에서 쿨다운 키 확인
    const isCooldown = await this.redisClient.get(cooldownKey);

    if (isCooldown) {
      // 쿨다운 기간 내에 다시 요청했을 경우 에러 발생
      throw new ConflictException('too_many_forgot_password_requests');
    }

    try {
      const user = await this.userService.findUserByEmail(value.email);

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
      throw new UnauthorizedException('reset_token_expired_or_invalid');
    }

    const userId = parseInt(userIdString, 10);
    const user = await this.userService.findUserById(userId);

    if (!user) {
      throw new UnauthorizedException('user_not_found');
    }

    // 3. 새 비밀번호 해싱 및 업데이트
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(value.newPassword, salt);
    user.password = hashedPassword;
    await this.userService.update(userId, user);

    // 4. 토큰 무효화: 비밀번호 업데이트 후 Redis에서 토큰 삭제 (DEL key)
    await this.redisClient.del(redisKey);

    return true;
  }
}

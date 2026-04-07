import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { LocalStrategy } from './strategies/local-strategy';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@/entity/user/user.entity';
import { JwtAccessStrategy } from './strategies/jwt-access-strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh-strategy';
import { UserModule } from '@/user/user.module';
import { ConfigService } from '@nestjs/config';
import { MailModule } from '@/mail/mail.module';
import { RedisModule } from '@nestjs-modules/ioredis';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const expiresIn = configService.get<string | number>(
          'config.jwt.accessTokenExpiration',
        ) as any;

        return {
          secret: configService.get<string>('config.jwt.jwtSecret'),
          signOptions: {
            expiresIn: expiresIn,
          },
        };
      },
    }),
    RedisModule,
    UserModule,
    MailModule,
  ],
  providers: [
    AuthService,
    LocalStrategy,
    JwtAccessStrategy,
    JwtRefreshStrategy,
  ],
  controllers: [AuthController],
})
export class AuthModule {}

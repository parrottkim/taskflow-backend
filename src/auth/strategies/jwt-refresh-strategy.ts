import { Inject, UnauthorizedException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import config from '@/config/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';

export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    @Inject(config.KEY)
    private configService: ConfigType<typeof config>,
  ) {
    super({
      usernameField: 'email',
      passwordField: 'password',
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request) =>
          request?.cookies?.[configService.cookie.refresh.name] ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.jwt.jwtRefreshSecret,
      passReqToCallback: true,
    });
  }

  async validate(request: Request, payload: any) {
    const refreshToken =
      request.cookies?.[this.configService.cookie.refresh.name];

    if (!refreshToken) {
      throw new UnauthorizedException('unauthorized_refresh_token_invalid');
    }

    return {
      id: payload.sub,
      email: payload.email,
      persistLogin: payload.persistLogin === true,
      refreshToken,
    };
  }
}

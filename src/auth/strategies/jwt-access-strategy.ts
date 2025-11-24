import { Inject, UnauthorizedException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import config from 'config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserService } from 'src/user/user.service';

export class JwtAccessStrategy extends PassportStrategy(
  Strategy,
  'jwt-access',
) {
  constructor(
    private userService: UserService,
    @Inject(config.KEY)
    configService: ConfigType<typeof config>,
  ) {
    super({
      usernameField: 'email',
      passwordField: 'password',
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.jwt.jwtAccessSecret,
    });
  }

  async validate(payload: any) {
    const user = await this.userService.findUserById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('user_not_found');
    }

    return user;
  }
}

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAccessAuthGuard extends AuthGuard('jwt-access') {
  handleRequest(err, user, info) {
    if (info && info.name === 'TokenExpiredError') {
      throw new UnauthorizedException('access_token_expired');
    }

    if (!user) {
      throw new UnauthorizedException('user_not_found');
    }

    return user;
  }
}

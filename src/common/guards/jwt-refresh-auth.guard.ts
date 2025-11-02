import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtRefreshAuthGuard extends AuthGuard('jwt-refresh') {
  handleRequest(err, user, info) {
    if (info && info.name === 'TokenExpiredError') {
      throw new UnauthorizedException('refresh_token_expired');
    }
    return user;
  }
}

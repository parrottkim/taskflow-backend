import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { Request } from 'express';
import config from '@/config/config';

@Injectable()
export class AuthOriginGuard implements CanActivate {
  constructor(
    @Inject(config.KEY)
    private readonly configService: ConfigType<typeof config>,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const requestOrigin = request.headers.origin;
    if (!requestOrigin) return true;

    const trustedOrigins = (this.configService.url.frontend || '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);

    if (!trustedOrigins.includes(requestOrigin)) {
      throw new ForbiddenException('forbidden_auth_origin');
    }

    return true;
  }
}

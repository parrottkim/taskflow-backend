import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { assertWriteAccess } from '../policies/write-access.policy';

@Injectable()
export class WriteAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    assertWriteAccess(request.user);
    return true;
  }
}

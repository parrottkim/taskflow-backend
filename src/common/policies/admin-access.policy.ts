import { ForbiddenException } from '@nestjs/common';

export interface AdminAccessUser {
  isAdmin: boolean;
}

export function assertAdmin(user: AdminAccessUser): void {
  if (!user.isAdmin) {
    throw new ForbiddenException('forbidden_access_denied');
  }
}

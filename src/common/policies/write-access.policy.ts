import { ForbiddenException } from '@nestjs/common';

export interface WriteAccessUser {
  isGuest: boolean;
}

export function assertWriteAccess(user: WriteAccessUser): void {
  if (user.isGuest) {
    throw new ForbiddenException('forbidden_guest_write_not_allowed');
  }
}

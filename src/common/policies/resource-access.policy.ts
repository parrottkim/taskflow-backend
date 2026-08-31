import { ForbiddenException } from '@nestjs/common';

export interface ResourceAccessUser {
  id: number;
  isAdmin: boolean;
}

export function assertOwnerOrAdmin(
  user: ResourceAccessUser,
  ownerId: number,
): void {
  if (!user.isAdmin && user.id !== ownerId) {
    throw new ForbiddenException('forbidden_access_denied');
  }
}

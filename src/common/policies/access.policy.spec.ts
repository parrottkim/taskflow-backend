import { ForbiddenException } from '@nestjs/common';
import { assertAdmin } from './admin-access.policy';
import { assertOwnerOrAdmin } from './resource-access.policy';

describe('access policies', () => {
  const owner = { id: 1, isAdmin: false };
  const admin = { id: 2, isAdmin: true };
  const other = { id: 3, isAdmin: false };

  it('allows the resource owner', () => {
    expect(() => assertOwnerOrAdmin(owner, owner.id)).not.toThrow();
  });

  it('allows an administrator', () => {
    expect(() => assertOwnerOrAdmin(admin, owner.id)).not.toThrow();
    expect(() => assertAdmin(admin)).not.toThrow();
  });

  it('rejects users without permission', () => {
    expect(() => assertOwnerOrAdmin(other, owner.id)).toThrow(
      new ForbiddenException('forbidden_access_denied'),
    );
    expect(() => assertAdmin(other)).toThrow(
      new ForbiddenException('forbidden_access_denied'),
    );
  });
});

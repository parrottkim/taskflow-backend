import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { WriteAccessGuard } from './write-access.guard';

describe('WriteAccessGuard', () => {
  const createContext = (isGuest: boolean) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user: { isGuest } }),
      }),
    }) as ExecutionContext;

  it('allows non-guest users', () => {
    expect(new WriteAccessGuard().canActivate(createContext(false))).toBe(
      true,
    );
  });

  it('rejects guest users', () => {
    expect(() =>
      new WriteAccessGuard().canActivate(createContext(true)),
    ).toThrow(new ForbiddenException('guest_read_only'));
  });
});

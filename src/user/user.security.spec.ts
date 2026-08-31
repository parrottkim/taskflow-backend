import {
  ForbiddenException,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user';
import { User } from '@/entity/user/user.entity';

describe('User update security', () => {
  const userRepository = {
    findOneBy: jest.fn(),
    update: jest.fn(),
  };
  const service = new UserService(
    {} as any,
    userRepository as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
  );

  beforeEach(() => jest.clearAllMocks());

  it('rejects updates to another user by a non-admin', async () => {
    const requester = {
      id: 1,
      isAdmin: false,
      isGuest: false,
    } as User;

    await expect(
      service.updateByUser(requester, 2, { username: 'attacker' }),
    ).rejects.toEqual(new ForbiddenException('forbidden_access_denied'));
    expect(userRepository.update).not.toHaveBeenCalled();
  });

  it('allows a user to update their own public profile fields', async () => {
    const requester = {
      id: 1,
      isAdmin: false,
      isGuest: false,
    } as User;
    userRepository.findOneBy.mockResolvedValue({ id: 1 });

    await service.updateByUser(requester, 1, { username: 'new-name' });

    expect(userRepository.update).toHaveBeenCalledWith(1, {
      username: 'new-name',
    });
  });

  it('returns not found when an admin targets a missing user', async () => {
    const requester = { id: 1, isAdmin: true, isGuest: false } as User;
    userRepository.findOneBy.mockResolvedValue(null);

    await expect(
      service.updateByUser(requester, 2, { username: 'new-name' }),
    ).rejects.toEqual(new NotFoundException('not_found_user'));
  });

  it.each(['email', 'password', 'refreshToken'])(
    'rejects the internal %s field in the public DTO',
    async (field) => {
      const pipe = new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      });

      await expect(
        pipe.transform(
          { [field]: 'not-allowed' },
          { type: 'body', metatype: UpdateUserDto },
        ),
      ).rejects.toBeDefined();
    },
  );
});

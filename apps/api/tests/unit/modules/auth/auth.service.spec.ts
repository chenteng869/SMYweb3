import { AuthService } from '@/modules/auth/auth.service';
import { PrismaService } from '@/common/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('@/common/prisma.service');
jest.mock('@nestjs/jwt');

describe('AuthService', () => {
  let service: AuthService;
  let mockPrisma: any;
  let mockJwt: JwtService;

  beforeEach(() => {
    mockPrisma = {
      adminUser: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      user: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      walletAccount: {
        create: jest.fn(),
      },
    };

    mockJwt = {
      sign: jest.fn().mockReturnValue('test-token'),
      signAsync: jest.fn().mockResolvedValue('test-token'),
      verify: jest.fn(),
      verifyAsync: jest.fn(),
      decode: jest.fn(),
      options: {} as any,
      logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() } as any,
    } as any;

    (PrismaService as unknown as jest.Mock).mockImplementation(() => mockPrisma);
    (JwtService as unknown as jest.Mock).mockImplementation(() => mockJwt);

    service = new AuthService(
      mockPrisma as PrismaService,
      mockJwt as JwtService,
      { consumeNonce: jest.fn() } as any
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockUser = {
        id: 1,
        username: 'admin',
        password: '$2b$10$hashedpassword',
        email: 'admin@test.com',
        name: 'Admin',
        avatar: null,
        roleId: 1,
        isActive: true,
        lastLoginAt: null,
        role: { code: 'admin', name: 'Administrator', permissions: ['*'] },
      };
      mockPrisma.adminUser.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock) = jest.fn().mockResolvedValue(true);
      mockPrisma.adminUser.update.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await service.login({ username: 'admin', password: 'password' }, '127.0.0.1');

      expect(result.token).toBe('test-token');
      expect(result.user.username).toBe('admin');
      expect(mockJwt.sign).toHaveBeenCalledWith({ sub: 1, username: 'admin' });
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockPrisma.adminUser.findUnique.mockResolvedValue(null);

      await expect(service.login({ username: 'wrong', password: 'pass' }, '127.0.0.1')).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should throw UnauthorizedException when password is incorrect', async () => {
      const mockUser = {
        id: 1,
        username: 'admin',
        password: '$2b$10$hashedpassword',
        isActive: true,
        role: {},
      };
      mockPrisma.adminUser.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock) = jest.fn().mockResolvedValue(false);

      await expect(service.login({ username: 'admin', password: 'wrong' }, '127.0.0.1')).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  describe('profile', () => {
    it('should return user profile', async () => {
      const mockUser = {
        id: 1,
        username: 'admin',
        email: 'admin@test.com',
        name: 'Admin',
        roleId: 1,
        role: { code: 'admin', name: 'Administrator', permissions: ['*'] },
      };
      mockPrisma.adminUser.findUnique.mockResolvedValue(mockUser);

      const result = await service.profile(1);

      expect(result.username).toBe('admin');
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockPrisma.adminUser.findUnique.mockResolvedValue(null);

      await expect(service.profile(999)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should logout successfully and create audit log', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await service.logout(1, '127.0.0.1');

      expect(result.message).toBe('已退出登录');
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });
  });
});
